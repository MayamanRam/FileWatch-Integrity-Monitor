import os
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Tuple, Dict, Optional
from sqlalchemy.orm import Session
from app.database.models import (
    MonitoredDirectory, IntegrityBaseline, BaselineFile,
    SecurityEvent, SecurityAlert, AuditLog, utc_now
)
from app.hashing.hasher import hash_file_streaming, determine_file_type
from app.monitoring.path_validator import is_path_excluded, is_safe_symlink
from app.core.security import (
    compute_baseline_record_hmac,
    compute_baseline_aggregate_hmac,
    compute_audit_log_hmac
)
from app.schemas.schemas import (
    BaselineVerificationResult, BaselineDiffItem
)
from app.baseline.tamper_detector import verify_baseline_integrity

def create_directory_baseline(
    db: Session,
    directory: MonitoredDirectory,
    name: str,
    description: str = ""
) -> IntegrityBaseline:
    """
    Scan a monitored directory and establish a cryptographically signed baseline.
    """
    base_path = Path(directory.path).resolve()
    if not base_path.exists() or not base_path.is_dir():
        raise ValueError(f"Directory {directory.path} does not exist or is not a directory.")

    # Deactivate existing active baselines for this directory
    db.query(IntegrityBaseline).filter(
        IntegrityBaseline.directory_id == directory.id,
        IntegrityBaseline.is_active == True
    ).update({"is_active": False})

    max_size_bytes = directory.max_file_size_mb * 1024 * 1024

    # Collect files
    file_list: List[Path] = []
    if directory.recursive:
        for root, dirs, files in os.walk(base_path):
            root_p = Path(root)
            # Filter subdirectories in-place
            dirs[:] = [
                d for d in dirs
                if not is_path_excluded(root_p / d, base_path, exclude_subdirectories=directory.exclude_subdirectories)
            ]
            for f in files:
                fp = root_p / f
                if not is_path_excluded(
                    fp,
                    base_path,
                    include_extensions=directory.include_extensions,
                    exclude_extensions=directory.exclude_extensions,
                    exclude_subdirectories=directory.exclude_subdirectories
                ):
                    file_list.append(fp)
    else:
        for item in base_path.iterdir():
            if item.is_file() and not is_path_excluded(
                item,
                base_path,
                include_extensions=directory.include_extensions,
                exclude_extensions=directory.exclude_extensions,
                exclude_subdirectories=directory.exclude_subdirectories
            ):
                file_list.append(item)

    file_list.sort(key=lambda p: p.as_posix())

    # Build baseline instance
    baseline = IntegrityBaseline(
        directory_id=directory.id,
        name=name,
        description=description,
        file_count=0,
        total_size_bytes=0,
        baseline_hash="",
        hmac_signature="",
        is_active=True,
        tamper_status="VALID",
        created_at=utc_now()
    )
    db.add(baseline)
    db.flush()

    total_size = 0
    hash_lines: List[str] = []
    baseline_files_to_add: List[BaselineFile] = []

    for fp in file_list:
        if fp.is_symlink() and not is_safe_symlink(fp, base_path):
            continue  # Skip unsafe symlinks pointing outside tree

        hash_res, err = hash_file_streaming(fp, base_dir=base_path, max_size_bytes=max_size_bytes)
        if err or not hash_res:
            continue

        total_size += hash_res.file_size
        hash_lines.append(f"{hash_res.relative_path}:{hash_res.sha256_hash}")

        rec_hmac = compute_baseline_record_hmac(
            baseline_id=baseline.id,
            relative_path=hash_res.relative_path,
            sha256_hash=hash_res.sha256_hash,
            file_size=hash_res.file_size,
            modified_time=hash_res.modified_time
        )

        b_file = BaselineFile(
            baseline_id=baseline.id,
            directory_id=directory.id,
            relative_path=hash_res.relative_path,
            file_name=hash_res.file_path.name,
            file_size=hash_res.file_size,
            sha256_hash=hash_res.sha256_hash,
            file_type=hash_res.file_type,
            file_permissions=hash_res.permissions,
            created_time=hash_res.created_time,
            modified_time=hash_res.modified_time,
            record_hmac=rec_hmac
        )
        baseline_files_to_add.append(b_file)

    db.add_all(baseline_files_to_add)

    # Compute root aggregate hash and HMAC
    aggregate_hash = hashlib.sha256("\n".join(hash_lines).encode("utf-8")).hexdigest()
    root_hmac = compute_baseline_aggregate_hmac(
        baseline_id=baseline.id,
        directory_id=directory.id,
        file_count=len(baseline_files_to_add),
        total_size=total_size,
        root_hash=aggregate_hash,
        created_at=baseline.created_at
    )

    baseline.file_count = len(baseline_files_to_add)
    baseline.total_size_bytes = total_size
    baseline.baseline_hash = aggregate_hash
    baseline.hmac_signature = root_hmac
    directory.last_scanned_at = utc_now()

    # Create audit log
    audit_id = hashlib.sha256(f"audit_{baseline.id}_{baseline.created_at.isoformat()}".encode()).hexdigest()[:36]
    audit_hmac = compute_audit_log_hmac(
        log_id=audit_id,
        timestamp_iso=baseline.created_at.isoformat(),
        action="BASELINE_CREATED",
        target_type="IntegrityBaseline",
        target_id=baseline.id,
        result="SUCCESS"
    )
    audit = AuditLog(
        id=audit_id,
        timestamp=baseline.created_at,
        action="BASELINE_CREATED",
        target_type="IntegrityBaseline",
        target_id=baseline.id,
        details=f"Created baseline '{name}' with {baseline.file_count} files ({total_size} bytes). Root hash: {aggregate_hash[:16]}...",
        actor="system",
        result="SUCCESS",
        hmac_signature=audit_hmac
    )
    db.add(audit)
    db.commit()
    db.refresh(baseline)
    return baseline

def verify_directory_against_baseline(
    db: Session,
    baseline_id: str
) -> BaselineVerificationResult:
    """
    Run full scheduled or on-demand integrity verification comparing disk state
    against the baseline.
    """
    baseline = db.query(IntegrityBaseline).filter(IntegrityBaseline.id == baseline_id).first()
    if not baseline:
        raise ValueError("Baseline not found.")

    directory = db.query(MonitoredDirectory).filter(MonitoredDirectory.id == baseline.directory_id).first()
    if not directory:
        raise ValueError("Associated monitored directory not found.")

    # First verify baseline internal integrity (tamper detection)
    tamper_res = verify_baseline_integrity(db, baseline)
    if tamper_res.is_tampered:
        # Generate critical alert for tampering
        alert = SecurityAlert(
            title="CRITICAL: Baseline Tampering Detected",
            description=f"Integrity check failed for baseline '{baseline.name}'. Database records have been modified without authorization: {tamper_res.message}",
            severity="CRITICAL",
            status="open",
            directory_path=directory.path,
            file_path=baseline.id
        )
        db.add(alert)
        db.commit()

    # Load baseline files indexed by relative_path
    b_files = db.query(BaselineFile).filter(BaselineFile.baseline_id == baseline.id).all()
    baseline_map: Dict[str, BaselineFile] = {f.relative_path: f for f in b_files}

    base_path = Path(directory.path).resolve()
    max_size_bytes = directory.max_file_size_mb * 1024 * 1024

    # Current disk scan
    current_files_map: Dict[str, Tuple[Path, Optional[Any]]] = {}
    if directory.recursive:
        for root, dirs, files in os.walk(base_path):
            root_p = Path(root)
            dirs[:] = [
                d for d in dirs
                if not is_path_excluded(root_p / d, base_path, exclude_subdirectories=directory.exclude_subdirectories)
            ]
            for f in files:
                fp = root_p / f
                if not is_path_excluded(
                    fp,
                    base_path,
                    include_extensions=directory.include_extensions,
                    exclude_extensions=directory.exclude_extensions,
                    exclude_subdirectories=directory.exclude_subdirectories
                ):
                    try:
                        rel = fp.relative_to(base_path).as_posix()
                        current_files_map[rel] = (fp, None)
                    except ValueError:
                        pass
    else:
        for item in base_path.iterdir():
            if item.is_file() and not is_path_excluded(
                item,
                base_path,
                include_extensions=directory.include_extensions,
                exclude_extensions=directory.exclude_extensions,
                exclude_subdirectories=directory.exclude_subdirectories
            ):
                rel = item.name
                current_files_map[rel] = (item, None)

    discrepancies: List[BaselineDiffItem] = []
    unchanged_count = 0
    modified_count = 0
    new_count = 0
    deleted_count = 0

    # 1. Check existing baseline files against disk
    for rel_path, b_file in baseline_map.items():
        if rel_path not in current_files_map:
            # File deleted from disk
            deleted_count += 1
            severity = "HIGH" if determine_file_type(Path(rel_path)) in ["executable", "config"] else "MEDIUM"
            discrepancies.append(BaselineDiffItem(
                relative_path=rel_path,
                status="DELETED",
                previous_hash=b_file.sha256_hash,
                current_hash=None,
                previous_size=b_file.file_size,
                current_size=None,
                severity=severity
            ))
        else:
            # File exists on disk, check hash
            fp, _ = current_files_map[rel_path]
            h_res, err = hash_file_streaming(fp, base_dir=base_path, max_size_bytes=max_size_bytes)
            if h_res:
                if h_res.sha256_hash == b_file.sha256_hash:
                    # Content matches
                    unchanged_count += 1
                else:
                    # Content modified!
                    modified_count += 1
                    file_type = determine_file_type(fp)
                    severity = "CRITICAL" if file_type == "executable" else ("HIGH" if file_type == "config" else "MEDIUM")
                    discrepancies.append(BaselineDiffItem(
                        relative_path=rel_path,
                        status="MODIFIED",
                        previous_hash=b_file.sha256_hash,
                        current_hash=h_res.sha256_hash,
                        previous_size=b_file.file_size,
                        current_size=h_res.file_size,
                        severity=severity
                    ))

    # 2. Check for new files not in baseline
    for rel_path, (fp, _) in current_files_map.items():
        if rel_path not in baseline_map:
            new_count += 1
            h_res, _ = hash_file_streaming(fp, base_dir=base_path, max_size_bytes=max_size_bytes)
            file_type = determine_file_type(fp)
            severity = "CRITICAL" if file_type == "executable" else ("HIGH" if file_type == "config" else "LOW")
            discrepancies.append(BaselineDiffItem(
                relative_path=rel_path,
                status="NEW",
                previous_hash=None,
                current_hash=h_res.sha256_hash if h_res else None,
                previous_size=None,
                current_size=h_res.file_size if h_res else None,
                severity=severity
            ))

    # Update directory last scanned time
    directory.last_scanned_at = utc_now()
    db.commit()

    return BaselineVerificationResult(
        baseline_id=baseline.id,
        directory_id=directory.id,
        directory_path=directory.path,
        verified_at=utc_now(),
        total_baseline_files=len(b_files),
        current_disk_files=len(current_files_map),
        unchanged_files=unchanged_count,
        modified_files=modified_count,
        new_files=new_count,
        deleted_files=deleted_count,
        tamper_status=tamper_res.status,
        discrepancies=discrepancies
    )
