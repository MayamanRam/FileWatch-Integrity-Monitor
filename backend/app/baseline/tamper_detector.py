import hashlib
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.database.models import IntegrityBaseline, BaselineFile, SecurityEvent, SecurityAlert, AuditLog
from app.core.security import (
    verify_hmac,
    compute_baseline_record_hmac,
    compute_baseline_aggregate_hmac,
    compute_audit_log_hmac,
    format_canonical_timestamp
)
from app.schemas.schemas import BaselineTamperCheckResult

def verify_baseline_integrity(db: Session, baseline: IntegrityBaseline) -> BaselineTamperCheckResult:
    """
    Cryptographically verify that baseline records and file entries have not been
    tampered with in the database.
    1. Validates the root HMAC signature of the baseline metadata.
    2. Recalculates the aggregate baseline hash from all file records.
    3. Validates individual HMAC signatures for every file record in the baseline.
    """
    tampered_files: List[str] = []
    
    # 1. Verify root HMAC
    root_ts = format_canonical_timestamp(baseline.created_at)
    canonical_root = f"{baseline.id}|{baseline.directory_id}|{baseline.file_count}|{baseline.total_size_bytes}|{baseline.baseline_hash}|{root_ts}"
    root_valid = verify_hmac(canonical_root, baseline.hmac_signature)
    
    # 2. Check individual file records and recalculate root hash
    files = db.query(BaselineFile).filter(BaselineFile.baseline_id == baseline.id).order_by(BaselineFile.relative_path).all()
    
    hash_lines = []
    for f in files:
        f_ts = format_canonical_timestamp(f.modified_time)
        canonical_file = f"{baseline.id}|{f.relative_path}|{f.sha256_hash}|{f.file_size}|{f_ts}"
        file_valid = verify_hmac(canonical_file, f.record_hmac)
        if not file_valid:
            tampered_files.append(f.relative_path)
        hash_lines.append(f"{f.relative_path}:{f.sha256_hash}")
        
    recomputed_aggregate = hashlib.sha256("\n".join(hash_lines).encode("utf-8")).hexdigest()
    aggregate_matches = (recomputed_aggregate == baseline.baseline_hash)
    
    is_tampered = (not root_valid) or (not aggregate_matches) or (len(tampered_files) > 0)
    status_str = "TAMPERED" if is_tampered else "VALID"
    
    # Update baseline status in DB if changed
    if baseline.tamper_status != status_str:
        baseline.tamper_status = status_str
        db.commit()
        
    msg = "Baseline integrity confirmed intact."
    if is_tampered:
        reasons = []
        if not root_valid:
            reasons.append("Root HMAC signature invalid")
        if not aggregate_matches:
            reasons.append("Recalculated aggregate hash mismatch")
        if tampered_files:
            reasons.append(f"{len(tampered_files)} individual file records tampered")
        msg = f"TAMPERING DETECTED: {', '.join(reasons)}"
        
    return BaselineTamperCheckResult(
        baseline_id=baseline.id,
        name=baseline.name,
        is_tampered=is_tampered,
        status=status_str,
        root_hmac_valid=root_valid,
        tampered_file_records=tampered_files,
        message=msg
    )
