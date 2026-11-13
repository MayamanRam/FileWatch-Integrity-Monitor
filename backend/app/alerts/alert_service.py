from typing import Optional
from sqlalchemy.orm import Session
from app.database.models import SecurityAlert, SecurityEvent, utc_now
from app.core.audit import log_audit_event

def create_alert_for_event(db: Session, event: SecurityEvent) -> Optional[SecurityAlert]:
    """
    Generate a security alert if the event severity warrants incident investigation.
    Alerts are created for MEDIUM, HIGH, and CRITICAL events.
    """
    if event.severity not in ["MEDIUM", "HIGH", "CRITICAL"]:
        return None

    title_map = {
        "CRITICAL": f"CRITICAL: {event.event_type.replace('_', ' ').title()} - {event.file_name}",
        "HIGH": f"HIGH: Suspicious {event.event_type.replace('_', ' ').title()} - {event.file_name}",
        "MEDIUM": f"Alert: {event.event_type.replace('_', ' ').title()} - {event.file_name}"
    }

    title = title_map.get(event.severity, f"Alert: {event.file_name}")

    alert = SecurityAlert(
        event_id=event.id,
        title=title,
        description=event.details,
        severity=event.severity,
        status="open",
        investigation_notes="",
        directory_path=event.directory_path,
        file_path=event.relative_path,
        created_at=utc_now(),
        updated_at=utc_now()
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)

    # Log audit
    log_audit_event(
        db,
        action="ALERT_TRIGGERED",
        target_type="SecurityAlert",
        target_id=alert.id,
        details=f"Alert [{alert.severity}] triggered for file '{event.file_name}': {event.details}",
        result="SUCCESS"
    )
    return alert

def update_alert(
    db: Session,
    alert_id: str,
    status: Optional[str] = None,
    notes: Optional[str] = None,
    actor: str = "security_analyst"
) -> Optional[SecurityAlert]:
    """
    Update alert status (open -> acknowledged -> resolved) and add investigation notes.
    """
    alert = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if not alert:
        return None

    now = utc_now()
    if status:
        valid_statuses = ["open", "acknowledged", "resolved"]
        if status in valid_statuses:
            old_status = alert.status
            alert.status = status
            if status == "acknowledged" and not alert.acknowledged_at:
                alert.acknowledged_at = now
            elif status == "resolved":
                alert.resolved_at = now

            log_audit_event(
                db,
                action="ALERT_STATUS_CHANGED",
                target_type="SecurityAlert",
                target_id=alert.id,
                details=f"Alert status updated from '{old_status}' to '{status}' by {actor}.",
                actor=actor,
                result="SUCCESS"
            )

    if notes is not None:
        alert.investigation_notes = notes

    alert.updated_at = now
    db.commit()
    db.refresh(alert)
    return alert

