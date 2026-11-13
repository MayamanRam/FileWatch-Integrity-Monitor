from pathlib import Path
from app.database.models import MonitoredDirectory, IntegrityBaseline, BaselineFile
from app.baseline.service import create_directory_baseline, verify_directory_against_baseline

def test_baseline_creation_and_verification(test_db_session, sample_monitored_dir):
    d = MonitoredDirectory(
        path=str(sample_monitored_dir.resolve()),
        label="Test Directory",
        recursive=True
    )
    test_db_session.add(d)
    test_db_session.commit()
    test_db_session.refresh(d)

    baseline = create_directory_baseline(test_db_session, d, name="Baseline v1")
    assert baseline.id is not None
    assert baseline.file_count == 4  # config.ini, app.py, payload.exe, data/report.txt
    assert len(baseline.baseline_hash) == 64
    assert len(baseline.hmac_signature) == 64
    assert baseline.tamper_status == "VALID"

    # Initial verification against untouched disk should have 0 discrepancies
    res = verify_directory_against_baseline(test_db_session, baseline.id)
    assert res.unchanged_files == 4
    assert res.modified_files == 0
    assert res.new_files == 0
    assert res.deleted_files == 0
    assert len(res.discrepancies) == 0

def test_baseline_detects_modified_file(test_db_session, sample_monitored_dir):
    d = MonitoredDirectory(
        path=str(sample_monitored_dir.resolve()),
        label="Test Directory 2",
        recursive=True
    )
    test_db_session.add(d)
    test_db_session.commit()

    baseline = create_directory_baseline(test_db_session, d, name="Baseline v1")

    # Modify config.ini
    config_p = sample_monitored_dir / "config.ini"
    config_p.write_text("port=9090\nenv=compromised\n", encoding="utf-8")

    res = verify_directory_against_baseline(test_db_session, baseline.id)
    assert res.modified_files == 1
    assert res.unchanged_files == 3

    mod_item = next(item for item in res.discrepancies if item.status == "MODIFIED")
    assert mod_item.relative_path == "config.ini"
    assert mod_item.severity == "HIGH"

def test_baseline_detects_new_and_deleted_files(test_db_session, sample_monitored_dir):
    d = MonitoredDirectory(
        path=str(sample_monitored_dir.resolve()),
        label="Test Directory 3",
        recursive=True
    )
    test_db_session.add(d)
    test_db_session.commit()

    baseline = create_directory_baseline(test_db_session, d, name="Baseline v1")

    # Add a new file
    new_f = sample_monitored_dir / "backdoor.sh"
    new_f.write_text("#!/bin/bash\necho bad\n", encoding="utf-8")

    # Delete app.py
    (sample_monitored_dir / "app.py").unlink()

    res = verify_directory_against_baseline(test_db_session, baseline.id)
    assert res.new_files == 1
    assert res.deleted_files == 1

    new_item = next(item for item in res.discrepancies if item.status == "NEW")
    assert new_item.relative_path == "backdoor.sh"
    assert new_item.severity == "CRITICAL"

    del_item = next(item for item in res.discrepancies if item.status == "DELETED")
    assert del_item.relative_path == "app.py"

