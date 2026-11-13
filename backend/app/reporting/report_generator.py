import csv
import io
import json
import uuid
from datetime import datetime
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.database.models import (
    MonitoredDirectory, IntegrityBaseline, BaselineFile,
    SecurityEvent, SecurityAlert, AuditLog, utc_now
)
from app.reporting.pdf_exporter import generate_pdf_report

def compile_integrity_report(
    db: Session,
    directory_id: Optional[str] = None,
    severity: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Compile comprehensive data for file integrity reporting.
    """
    # Monitored directories query
    dir_q = db.query(MonitoredDirectory)
    if directory_id:
        dir_q = dir_q.filter(MonitoredDirectory.id == directory_id)
    directories = dir_q.all()

    # Active baselines query
    base_q = db.query(IntegrityBaseline).filter(IntegrityBaseline.is_active == True)
    if directory_id:
        base_q = base_q.filter(IntegrityBaseline.directory_id == directory_id)
    baselines = base_q.all()

    # Security events query
    event_q = db.query(SecurityEvent)
    if directory_id:
        event_q = event_q.filter(SecurityEvent.directory_id == directory_id)
    if severity:
        event_q = event_q.filter(SecurityEvent.severity == severity.upper())
    if start_date:
        event_q = event_q.filter(SecurityEvent.timestamp >= start_date)
    if end_date:
        event_q = event_q.filter(SecurityEvent.timestamp <= end_date)
    events = event_q.order_by(SecurityEvent.timestamp.desc()).all()

    # Security alerts query
    alert_q = db.query(SecurityAlert)
    if severity:
        alert_q = alert_q.filter(SecurityAlert.severity == severity.upper())
    alerts = alert_q.order_by(SecurityAlert.created_at.desc()).all()

    total_files = sum(b.file_count for b in baselines)
    tamper_issues = any(b.tamper_status == "TAMPERED" for b in baselines)

    critical_events = sum(1 for e in events if e.severity == "CRITICAL")
    high_events = sum(1 for e in events if e.severity == "HIGH")
    medium_events = sum(1 for e in events if e.severity == "MEDIUM")
    low_events = sum(1 for e in events if e.severity == "LOW")

    report_id = f"FW-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    report_data = {
        "report_id": report_id,
        "generated_at": utc_now().isoformat(),
        "directory_count": len(directories),
        "baseline_count": len(baselines),
        "total_files_monitored": total_files,
        "tamper_status": "TAMPERED" if tamper_issues else "VALID",
        "summary_stats": {
            "total_events": len(events),
            "critical_events": critical_events,
            "high_events": high_events,
            "medium_events": medium_events,
            "low_events": low_events,
            "total_alerts": len(alerts),
            "open_alerts": sum(1 for a in alerts if a.status == "open")
        },
        "directories": [
            {
                "id": d.id,
                "label": d.label,
                "path": d.path,
                "recursive": d.recursive,
                "status": d.status,
                "last_scanned_at": d.last_scanned_at.isoformat() if d.last_scanned_at else None,
                "file_count": next((b.file_count for b in baselines if b.directory_id == d.id), 0)
            }
            for d in directories
        ],
        "events": [
            {
                "id": e.id,
                "timestamp": e.timestamp.isoformat(),
                "relative_path": e.relative_path,
                "file_name": e.file_name,
                "event_type": e.event_type,
                "severity": e.severity,
                "previous_hash": e.previous_hash,
                "current_hash": e.current_hash,
                "details": e.details,
                "verification_status": e.verification_status
            }
            for e in events
        ],
        "alerts": [
            {
                "id": a.id,
                "title": a.title,
                "severity": a.severity,
                "status": a.status,
                "file_path": a.file_path,
                "description": a.description,
                "investigation_notes": a.investigation_notes,
                "created_at": a.created_at.isoformat(),
                "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None
            }
            for a in alerts
        ]
    }
    return report_data

def export_report_csv(report_data: Dict[str, Any]) -> str:
    """
    Format report events and alerts as CSV tabular records.
    """
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(["FILEWATCH SECURITY EVENTS REPORT"])
    writer.writerow(["Report ID", report_data.get("report_id")])
    writer.writerow(["Generated At", report_data.get("generated_at")])
    writer.writerow([])

    writer.writerow([
        "Event ID", "Timestamp", "Event Type", "Severity",
        "File Name", "Relative Path", "Previous Hash", "Current Hash", "Details"
    ])
    for e in report_data.get("events", []):
        writer.writerow([
            e.get("id"),
            e.get("timestamp"),
            e.get("event_type"),
            e.get("severity"),
            e.get("file_name"),
            e.get("relative_path"),
            e.get("previous_hash") or "N/A",
            e.get("current_hash") or "N/A",
            e.get("details")
        ])

    writer.writerow([])
    writer.writerow(["FILEWATCH SECURITY ALERTS"])
    writer.writerow(["Alert ID", "Title", "Severity", "Status", "Target File", "Created At", "Description"])
    for a in report_data.get("alerts", []):
        writer.writerow([
            a.get("id"),
            a.get("title"),
            a.get("severity"),
            a.get("status"),
            a.get("file_path"),
            a.get("created_at"),
            a.get("description")
        ])

    return output.getvalue()

