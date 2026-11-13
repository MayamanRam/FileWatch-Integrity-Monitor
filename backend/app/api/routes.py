from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import JSONResponse, PlainTextResponse
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database.session import get_db
from app.database.models import (
    MonitoredDirectory, IntegrityBaseline, BaselineFile,
    SecurityEvent, SecurityAlert, AuditLog, utc_now
)
from app.schemas.schemas import (
    DirectoryCreate, DirectoryUpdate, DirectoryResponse,
    BaselineCreate, BaselineResponse, BaselineDetailResponse,
    BaselineVerificationResult, BaselineTamperCheckResult,
    SecurityEventResponse, SecurityAlertResponse, AlertUpdate,
    AuditLogResponse, SystemStatusResponse, ReportExportRequest
)
from app.monitoring.path_validator import validate_directory_path
from app.monitoring.watcher import monitoring_orchestrator
from app.baseline.service import create_directory_baseline, verify_directory_against_baseline
from app.baseline.tamper_detector import verify_baseline_integrity
from app.alerts.alert_service import update_alert, create_alert_for_event
from app.core.audit import log_audit_event
from app.reporting.report_generator import compile_integrity_report, export_report_csv
from app.reporting.pdf_exporter import generate_pdf_report

router = APIRouter()

# -------------------------------------------------------------
# System Status & Health
# -------------------------------------------------------------
@router.get("/system/status", response_model=SystemStatusResponse)
def get_system_status(db: Session = Depends(get_db)):
    dirs_count = db.query(MonitoredDirectory).count()
    active_baselines = db.query(IntegrityBaseline).filter(IntegrityBaseline.is_active == True).all()
    baselines_count = len(active_baselines)
    total_files = sum(b.file_count for b in active_baselines)
    
    open_alerts = db.query(SecurityAlert).filter(SecurityAlert.status == "open").count()
    critical_alerts = db.query(SecurityAlert).filter(
        SecurityAlert.status == "open",
        SecurityAlert.severity == "CRITICAL"
    ).count()

    cutoff_24h = datetime.now(timezone.utc).timestamp() - 86400
    events_24h = db.query(SecurityEvent).filter(
        SecurityEvent.timestamp >= datetime.fromtimestamp(cutoff_24h, timezone.utc)
    ).count()

    last_scanned = db.query(func.max(MonitoredDirectory.last_scanned_at)).scalar()
    has_tamper = any(b.tamper_status == "TAMPERED" for b in active_baselines)

    # Status determination
    status = "OPERATIONAL"
    if has_tamper or critical_alerts > 0:
        status = "DEGRADED"

    return SystemStatusResponse(
        system_status=status,
        is_monitoring_active=True,
        monitored_directories_count=dirs_count,
        active_baselines_count=baselines_count,
        total_monitored_files=total_files,
        open_alerts_count=open_alerts,
        critical_alerts_count=critical_alerts,
        events_last_24h=events_24h,
        last_verification_time=last_scanned,
        baseline_tamper_detected=has_tamper
    )

@router.get("/system/health")
def get_health():
    return {
        "status": "healthy",
        "service": "FileWatch Integrity Monitor",
        "timestamp": utc_now().isoformat()
    }

# -------------------------------------------------------------
# Directory Registration & Management
# -------------------------------------------------------------
@router.get("/directories", response_model=List[DirectoryResponse])
def list_directories(db: Session = Depends(get_db)):
    dirs = db.query(MonitoredDirectory).all()
    result = []
    for d in dirs:
        active_b = db.query(IntegrityBaseline).filter(
            IntegrityBaseline.directory_id == d.id,
            IntegrityBaseline.is_active == True
        ).first()
        result.append(DirectoryResponse(
            id=d.id,
            path=d.path,
            label=d.label,
            recursive=d.recursive,
            include_extensions=d.include_extensions or [],
            exclude_extensions=d.exclude_extensions or [],
            exclude_subdirectories=d.exclude_subdirectories or [],
            max_file_size_mb=d.max_file_size_mb,
            is_active=d.is_active,
            status=d.status,
            last_scanned_at=d.last_scanned_at,
            created_at=d.created_at,
            updated_at=d.updated_at,
            file_count=active_b.file_count if active_b else 0,
            active_baseline_id=active_b.id if active_b else None
        ))
    return result

@router.post("/directories", response_model=DirectoryResponse, status_code=201)
def add_directory(data: DirectoryCreate, db: Session = Depends(get_db)):
    # Validate path strictly
    is_valid, err_msg, validated_path = validate_directory_path(data.path)
    if not is_valid or not validated_path:
        raise HTTPException(status_code=400, detail=err_msg or "Invalid directory path.")

    normalized_path_str = str(validated_path)

    # Check for duplicate
    existing = db.query(MonitoredDirectory).filter(MonitoredDirectory.path == normalized_path_str).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Directory is already registered: {normalized_path_str}")

    directory = MonitoredDirectory(
        path=normalized_path_str,
        label=data.label.strip() or validated_path.name,
        recursive=data.recursive,
        include_extensions=data.include_extensions,
        exclude_extensions=data.exclude_extensions,
        exclude_subdirectories=data.exclude_subdirectories,
        max_file_size_mb=data.max_file_size_mb,
        is_active=True,
        status="active"
    )
    db.add(directory)
    db.commit()
    db.refresh(directory)

    # Start filesystem event watcher
    monitoring_orchestrator.start_monitoring_directory(directory.id, directory.path, recursive=directory.recursive)

    # Automatically create initial baseline
    b_name = f"Initial Baseline - {datetime.now().strftime('%b %d, %Y')}"
    initial_baseline = create_directory_baseline(
        db=db,
        directory=directory,
        name=b_name,
        description="Automated baseline established upon directory onboarding."
    )

    log_audit_event(
        db,
        action="DIRECTORY_REGISTERED",
        target_type="MonitoredDirectory",
        target_id=directory.id,
        details=f"Registered '{directory.label}' ({directory.path}) with initial baseline ({initial_baseline.file_count} files).",
        result="SUCCESS"
    )

    return DirectoryResponse(
        id=directory.id,
        path=directory.path,
        label=directory.label,
        recursive=directory.recursive,
        include_extensions=directory.include_extensions or [],
        exclude_extensions=directory.exclude_extensions or [],
        exclude_subdirectories=directory.exclude_subdirectories or [],
        max_file_size_mb=directory.max_file_size_mb,
        is_active=directory.is_active,
        status=directory.status,
        last_scanned_at=directory.last_scanned_at,
        created_at=directory.created_at,
        updated_at=directory.updated_at,
        file_count=initial_baseline.file_count,
        active_baseline_id=initial_baseline.id
    )

@router.get("/directories/{dir_id}", response_model=DirectoryResponse)
def get_directory(dir_id: str, db: Session = Depends(get_db)):
    d = db.query(MonitoredDirectory).filter(MonitoredDirectory.id == dir_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Directory not found.")
    active_b = db.query(IntegrityBaseline).filter(
        IntegrityBaseline.directory_id == d.id,
        IntegrityBaseline.is_active == True
    ).first()
    return DirectoryResponse(
        id=d.id,
        path=d.path,
        label=d.label,
        recursive=d.recursive,
        include_extensions=d.include_extensions or [],
        exclude_extensions=d.exclude_extensions or [],
        exclude_subdirectories=d.exclude_subdirectories or [],
        max_file_size_mb=d.max_file_size_mb,
        is_active=d.is_active,
        status=d.status,
        last_scanned_at=d.last_scanned_at,
        created_at=d.created_at,
        updated_at=d.updated_at,
        file_count=active_b.file_count if active_b else 0,
        active_baseline_id=active_b.id if active_b else None
    )

@router.delete("/directories/{dir_id}", status_code=204)
def remove_directory(dir_id: str, db: Session = Depends(get_db)):
    d = db.query(MonitoredDirectory).filter(MonitoredDirectory.id == dir_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Directory not found.")

    monitoring_orchestrator.stop_monitoring_directory(d.id)

    log_audit_event(
        db,
        action="DIRECTORY_REMOVED",
        target_type="MonitoredDirectory",
        target_id=d.id,
        details=f"Removed monitored directory '{d.label}' ({d.path}).",
        result="SUCCESS"
    )

    db.delete(d)
    db.commit()
    return Response(status_code=204)

@router.post("/directories/{dir_id}/pause")
def pause_directory_monitoring(dir_id: str, db: Session = Depends(get_db)):
    d = db.query(MonitoredDirectory).filter(MonitoredDirectory.id == dir_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Directory not found.")
    monitoring_orchestrator.stop_monitoring_directory(d.id)
    d.status = "paused"
    db.commit()
    log_audit_event(db, "MONITORING_PAUSED", "MonitoredDirectory", d.id, f"Paused monitoring for {d.label}")
    return {"message": f"Monitoring paused for {d.label}."}

@router.post("/directories/{dir_id}/resume")
def resume_directory_monitoring(dir_id: str, db: Session = Depends(get_db)):
    d = db.query(MonitoredDirectory).filter(MonitoredDirectory.id == dir_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Directory not found.")
    monitoring_orchestrator.start_monitoring_directory(d.id, d.path, recursive=d.recursive)
    d.status = "active"
    db.commit()
    log_audit_event(db, "MONITORING_RESUMED", "MonitoredDirectory", d.id, f"Resumed monitoring for {d.label}")
    return {"message": f"Monitoring resumed for {d.label}."}

@router.post("/directories/{dir_id}/scan")
def trigger_directory_scan(dir_id: str, db: Session = Depends(get_db)):
    d = db.query(MonitoredDirectory).filter(MonitoredDirectory.id == dir_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Directory not found.")
    active_b = db.query(IntegrityBaseline).filter(
        IntegrityBaseline.directory_id == d.id,
        IntegrityBaseline.is_active == True
    ).first()
    if not active_b:
        raise HTTPException(status_code=400, detail="No active baseline exists for this directory. Please create one.")
    result = verify_directory_against_baseline(db, active_b.id)

    # Record discrepancies found during scan
    for item in result.discrepancies:
        if item.status == "UNCHANGED":
            continue
        event_type = f"FILE_{item.status}"
        sec_event = SecurityEvent(
            timestamp=utc_now(),
            directory_id=d.id,
            directory_path=d.path,
            relative_path=item.relative_path,
            file_name=item.relative_path.split("/")[-1],
            event_type=event_type,
            severity=item.severity,
            previous_hash=item.previous_hash,
            current_hash=item.current_hash,
            previous_metadata={"size": item.previous_size},
            current_metadata={"size": item.current_size},
            details=f"On-demand integrity verification detected: {item.status}",
            verification_status="confirmed_by_scan",
            baseline_id=active_b.id,
            investigation_status="new"
        )
        db.add(sec_event)
        db.commit()
        db.refresh(sec_event)
        create_alert_for_event(db, sec_event)

    return result

# -------------------------------------------------------------
# Baselines
# -------------------------------------------------------------
@router.get("/baselines", response_model=List[BaselineResponse])
def list_baselines(directory_id: Optional[str] = None, db: Session = Depends(get_db)):
    q = db.query(IntegrityBaseline)
    if directory_id:
        q = q.filter(IntegrityBaseline.directory_id == directory_id)
    return q.order_by(IntegrityBaseline.created_at.desc()).all()

@router.post("/baselines", response_model=BaselineResponse, status_code=201)
def create_baseline_endpoint(data: BaselineCreate, db: Session = Depends(get_db)):
    d = db.query(MonitoredDirectory).filter(MonitoredDirectory.id == data.directory_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Monitored directory not found.")
    baseline = create_directory_baseline(db, d, name=data.name, description=data.description or "")
    return baseline

@router.get("/baselines/{b_id}", response_model=BaselineDetailResponse)
def get_baseline_detail(b_id: str, db: Session = Depends(get_db)):
    b = db.query(IntegrityBaseline).filter(IntegrityBaseline.id == b_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Baseline not found.")
    files = db.query(BaselineFile).filter(BaselineFile.baseline_id == b.id).order_by(BaselineFile.relative_path).all()
    return BaselineDetailResponse(
        id=b.id,
        directory_id=b.directory_id,
        name=b.name,
        description=b.description,
        file_count=b.file_count,
        total_size_bytes=b.total_size_bytes,
        baseline_hash=b.baseline_hash,
        is_active=b.is_active,
        tamper_status=b.tamper_status,
        created_at=b.created_at,
        files=files
    )

@router.get("/baselines/{b_id}/verify", response_model=BaselineVerificationResult)
def verify_baseline_endpoint(b_id: str, db: Session = Depends(get_db)):
    try:
        return verify_directory_against_baseline(db, b_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/baselines/{b_id}/tamper-check", response_model=BaselineTamperCheckResult)
def check_baseline_tamper(b_id: str, db: Session = Depends(get_db)):
    b = db.query(IntegrityBaseline).filter(IntegrityBaseline.id == b_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Baseline not found.")
    return verify_baseline_integrity(db, b)

@router.post("/baselines/{b_id}/activate")
def activate_baseline(b_id: str, db: Session = Depends(get_db)):
    b = db.query(IntegrityBaseline).filter(IntegrityBaseline.id == b_id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Baseline not found.")
    # Deactivate others for same directory
    db.query(IntegrityBaseline).filter(
        IntegrityBaseline.directory_id == b.directory_id
    ).update({"is_active": False})
    b.is_active = True
    db.commit()
    log_audit_event(db, "BASELINE_ACTIVATED", "IntegrityBaseline", b.id, f"Activated baseline '{b.name}'")
    return {"message": f"Baseline '{b.name}' is now active."}

# -------------------------------------------------------------
# Security Events
# -------------------------------------------------------------
@router.get("/events", response_model=List[SecurityEventResponse])
def list_events(
    directory_id: Optional[str] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db)
):
    limit_val = limit if isinstance(limit, int) else (getattr(limit, "default", 100) or 100)
    offset_val = offset if isinstance(offset, int) else (getattr(offset, "default", 0) or 0)
    q = db.query(SecurityEvent)
    if directory_id:
        q = q.filter(SecurityEvent.directory_id == directory_id)
    if event_type:
        q = q.filter(SecurityEvent.event_type == event_type.upper())
    if severity:
        q = q.filter(SecurityEvent.severity == severity.upper())
    return q.order_by(SecurityEvent.timestamp.desc()).offset(offset_val).limit(limit_val).all()

@router.get("/events/{event_id}", response_model=SecurityEventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    e = db.query(SecurityEvent).filter(SecurityEvent.id == event_id).first()
    if not e:
        raise HTTPException(status_code=404, detail="Security event not found.")
    return e

# -------------------------------------------------------------
# Security Alerts
# -------------------------------------------------------------
@router.get("/alerts", response_model=List[SecurityAlertResponse])
def list_alerts(
    status: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    limit_val = limit if isinstance(limit, int) else (getattr(limit, "default", 100) or 100)
    q = db.query(SecurityAlert)
    if status:
        q = q.filter(SecurityAlert.status == status.lower())
    if severity:
        q = q.filter(SecurityAlert.severity == severity.upper())
    return q.order_by(SecurityAlert.created_at.desc()).limit(limit_val).all()

@router.get("/alerts/{alert_id}", response_model=SecurityAlertResponse)
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    a = db.query(SecurityAlert).filter(SecurityAlert.id == alert_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Alert not found.")
    return a

@router.patch("/alerts/{alert_id}", response_model=SecurityAlertResponse)
def update_alert_endpoint(alert_id: str, data: AlertUpdate, db: Session = Depends(get_db)):
    updated = update_alert(
        db=db,
        alert_id=alert_id,
        status=data.status,
        notes=data.investigation_notes
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Alert not found.")
    return updated

# -------------------------------------------------------------
# Audit Logs
# -------------------------------------------------------------
@router.get("/audit-logs", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = None,
    limit: int = Query(default=100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    limit_val = limit if isinstance(limit, int) else (getattr(limit, "default", 100) or 100)
    q = db.query(AuditLog)
    if action:
        q = q.filter(AuditLog.action == action.upper())
    return q.order_by(AuditLog.timestamp.desc()).limit(limit_val).all()

# -------------------------------------------------------------
# Reports
# -------------------------------------------------------------
@router.post("/reports/export")
def export_report_endpoint(params: ReportExportRequest, db: Session = Depends(get_db)):
    report_data = compile_integrity_report(
        db=db,
        directory_id=params.directory_id,
        severity=params.severity,
        start_date=params.start_date,
        end_date=params.end_date
    )

    fmt = params.format.lower()
    if fmt == "csv":
        csv_text = export_report_csv(report_data)
        return Response(
            content=csv_text,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=filewatch_report_{report_data['report_id']}.csv"}
        )
    elif fmt == "pdf":
        pdf_bytes = generate_pdf_report(report_data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=filewatch_report_{report_data['report_id']}.pdf"}
        )
    else:
        return JSONResponse(content=report_data)
