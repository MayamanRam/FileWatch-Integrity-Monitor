import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.database.models import AuditLog, utc_now
from app.core.security import compute_audit_log_hmac

def log_audit_event(
    db: Session,
    action: str,
    target_type: str,
    target_id: str,
    details: str,
    actor: str = "system",
    result: str = "SUCCESS"
) -> AuditLog:
    """
    Append a tamper-evident audit log entry to the database.
    """
    log_id = str(uuid.uuid4())
    ts = utc_now()
    ts_iso = ts.isoformat()

    hmac_sig = compute_audit_log_hmac(
        log_id=log_id,
        timestamp_iso=ts_iso,
        action=action,
        target_type=target_type,
        target_id=target_id,
        result=result
    )

    log_entry = AuditLog(
        id=log_id,
        timestamp=ts,
        action=action,
        target_type=target_type,
        target_id=target_id,
        details=details,
        actor=actor,
        result=result,
        hmac_signature=hmac_sig
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry

