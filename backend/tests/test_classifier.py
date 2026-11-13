from app.detection.classifier import classify_event_severity

def test_classify_executable_modification():
    sev, reason = classify_event_severity("FILE_MODIFIED", "C:/bin/service.exe")
    assert sev == "CRITICAL"
    assert "Executable binary" in reason

def test_classify_config_modification():
    sev, reason = classify_event_severity("FILE_MODIFIED", "C:/etc/nginx.conf")
    assert sev == "HIGH"
    assert "configuration file" in reason

def test_classify_text_file_modification():
    sev, reason = classify_event_severity("FILE_MODIFIED", "C:/notes.txt")
    assert sev == "MEDIUM"

def test_classify_metadata_changed():
    sev, reason = classify_event_severity("METADATA_CHANGED", "C:/app.py")
    assert sev == "LOW"

def test_classify_baseline_tampering():
    sev, reason = classify_event_severity("BASELINE_TAMPERING_SUSPECTED", "database.db")
    assert sev == "CRITICAL"

