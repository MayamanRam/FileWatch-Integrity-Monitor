import pytest
from fastapi import HTTPException
from app.api.routes import (
    get_system_status, get_health, list_directories, add_directory,
    get_directory, remove_directory, pause_directory_monitoring,
    resume_directory_monitoring, trigger_directory_scan,
    list_baselines, get_baseline_detail, check_baseline_tamper,
    list_alerts, update_alert_endpoint, export_report_endpoint
)
from app.schemas.schemas import (
    DirectoryCreate, AlertUpdate, ReportExportRequest
)

def test_system_status_and_health(test_db_session):
    health = get_health()
    assert health["status"] == "healthy"
    assert "FileWatch" in health["service"]

    status = get_system_status(db=test_db_session)
    assert status.system_status == "OPERATIONAL"
    assert status.is_monitoring_active is True
    assert status.monitored_directories_count == 0
    assert status.total_monitored_files == 0

def test_directory_lifecycle_via_api(test_db_session, sample_monitored_dir):
    data = DirectoryCreate(
        path=str(sample_monitored_dir.resolve()),
        label="Test Web Root",
        recursive=True,
        include_extensions=[],
        exclude_extensions=[],
        exclude_subdirectories=[],
        max_file_size_mb=50
    )
    # Add directory
    dir_res = add_directory(data=data, db=test_db_session)
    assert dir_res.id is not None
    assert dir_res.label == "Test Web Root"
    assert dir_res.file_count == 4
    assert dir_res.active_baseline_id is not None

    # Duplicate rejection
    with pytest.raises(HTTPException) as exc:
        add_directory(data=data, db=test_db_session)
    assert exc.value.status_code == 409

    # List directories
    dirs = list_directories(db=test_db_session)
    assert len(dirs) == 1
    assert dirs[0].id == dir_res.id

    # Get single directory
    single = get_directory(dir_id=dir_res.id, db=test_db_session)
    assert single.path == dir_res.path

    # Pause and Resume
    pause_res = pause_directory_monitoring(dir_id=dir_res.id, db=test_db_session)
    assert "paused" in pause_res["message"]

    resume_res = resume_directory_monitoring(dir_id=dir_res.id, db=test_db_session)
    assert "resumed" in resume_res["message"]

def test_traversal_path_rejected_by_api(test_db_session):
    data = DirectoryCreate(
        path="C:/some/../../traversal",
        label="Bad Path"
    )
    with pytest.raises(HTTPException) as exc:
        add_directory(data=data, db=test_db_session)
    assert exc.value.status_code == 400
    assert "Path traversal" in exc.value.detail

def test_baseline_endpoints(test_db_session, sample_monitored_dir):
    data = DirectoryCreate(
        path=str(sample_monitored_dir.resolve()),
        label="Baseline Test Dir",
        recursive=True
    )
    d = add_directory(data=data, db=test_db_session)
    b_id = d.active_baseline_id

    # List baselines
    baselines = list_baselines(directory_id=d.id, db=test_db_session)
    assert len(baselines) == 1
    assert baselines[0].id == b_id

    # Baseline detail
    detail = get_baseline_detail(b_id=b_id, db=test_db_session)
    assert len(detail.files) == 4

    # Tamper check
    tamper_res = check_baseline_tamper(b_id=b_id, db=test_db_session)
    assert tamper_res.is_tampered is False
    assert tamper_res.status == "VALID"

def test_alerts_and_investigation_workflow(test_db_session, sample_monitored_dir):
    data = DirectoryCreate(
        path=str(sample_monitored_dir.resolve()),
        label="Alert Test Dir",
        recursive=True
    )
    d = add_directory(data=data, db=test_db_session)

    # Modify executable to trigger alert during scan
    (sample_monitored_dir / "payload.exe").write_bytes(b"\x90\x90\x90\x90MALICIOUS")
    scan_res = trigger_directory_scan(dir_id=d.id, db=test_db_session)
    assert scan_res.modified_files == 1

    # Check alert list
    alerts = list_alerts(db=test_db_session)
    assert len(alerts) >= 1
    target_alert = alerts[0]
    assert target_alert.status == "open"
    assert target_alert.severity in ["CRITICAL", "HIGH"]

    # Acknowledge alert
    ack_res = update_alert_endpoint(
        alert_id=target_alert.id,
        data=AlertUpdate(status="acknowledged", investigation_notes="Investigating suspect executable modification."),
        db=test_db_session
    )
    assert ack_res.status == "acknowledged"
    assert "Investigating suspect" in ack_res.investigation_notes

    # Resolve alert
    res_res = update_alert_endpoint(
        alert_id=target_alert.id,
        data=AlertUpdate(status="resolved", investigation_notes="Verified as test artifact; threat neutralized."),
        db=test_db_session
    )
    assert res_res.status == "resolved"

def test_report_export_api(test_db_session, sample_monitored_dir):
    data = DirectoryCreate(
        path=str(sample_monitored_dir.resolve()),
        label="Reporting Folder",
        recursive=True
    )
    add_directory(data=data, db=test_db_session)

    # Export JSON
    json_res = export_report_endpoint(ReportExportRequest(format="json"), db=test_db_session)
    assert json_res.status_code == 200

    # Export CSV
    csv_res = export_report_endpoint(ReportExportRequest(format="csv"), db=test_db_session)
    assert csv_res.status_code == 200
    assert csv_res.media_type == "text/csv"

    # Export PDF
    pdf_res = export_report_endpoint(ReportExportRequest(format="pdf"), db=test_db_session)
    assert pdf_res.status_code == 200
    assert pdf_res.media_type == "application/pdf"
    assert len(pdf_res.body) > 100
