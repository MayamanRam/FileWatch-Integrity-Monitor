from app.database.models import MonitoredDirectory, IntegrityBaseline, BaselineFile
from app.baseline.service import create_directory_baseline
from app.baseline.tamper_detector import verify_baseline_integrity

def test_tamper_detection_on_intact_baseline(test_db_session, sample_monitored_dir):
    d = MonitoredDirectory(
        path=str(sample_monitored_dir.resolve()),
        label="Tamper Test Dir",
        recursive=True
    )
    test_db_session.add(d)
    test_db_session.commit()

    baseline = create_directory_baseline(test_db_session, d, name="Clean Baseline")
    res = verify_baseline_integrity(test_db_session, baseline)
    assert res.is_tampered is False
    assert res.status == "VALID"
    assert res.root_hmac_valid is True
    assert len(res.tampered_file_records) == 0

def test_tamper_detection_when_file_record_altered(test_db_session, sample_monitored_dir):
    d = MonitoredDirectory(
        path=str(sample_monitored_dir.resolve()),
        label="Tamper Test Dir 2",
        recursive=True
    )
    test_db_session.add(d)
    test_db_session.commit()

    baseline = create_directory_baseline(test_db_session, d, name="Baseline To Tamper")

    # Attacker directly alters the database record for payload.exe to disguise malicious code
    target_record = test_db_session.query(BaselineFile).filter(
        BaselineFile.baseline_id == baseline.id,
        BaselineFile.relative_path == "payload.exe"
    ).first()
    assert target_record is not None

    # Alter the hash without updating HMAC
    target_record.sha256_hash = "0000000000000000000000000000000000000000000000000000000000000000"
    test_db_session.commit()

    # Now verify baseline integrity
    res = verify_baseline_integrity(test_db_session, baseline)
    assert res.is_tampered is True
    assert res.status == "TAMPERED"
    assert "payload.exe" in res.tampered_file_records
    assert "TAMPERING DETECTED" in res.message

def test_tamper_detection_when_root_signature_altered(test_db_session, sample_monitored_dir):
    d = MonitoredDirectory(
        path=str(sample_monitored_dir.resolve()),
        label="Tamper Test Dir 3",
        recursive=True
    )
    test_db_session.add(d)
    test_db_session.commit()

    baseline = create_directory_baseline(test_db_session, d, name="Baseline Root Tamper")

    # Invalidate root HMAC signature
    baseline.hmac_signature = "bad_hmac_signature_0000000000000000000000000000000000000000000000"
    test_db_session.commit()

    res = verify_baseline_integrity(test_db_session, baseline)
    assert res.is_tampered is True
    assert res.root_hmac_valid is False

