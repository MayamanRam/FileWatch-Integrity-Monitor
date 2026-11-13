from app.core.config import settings
from app.core.security import calculate_hmac, verify_hmac, compute_audit_log_hmac, format_canonical_timestamp
from app.core.audit import log_audit_event
from app.database.models import AuditLog

def test_hmac_secret_key_strength():
    assert settings.HMAC_SECRET_KEY is not None
    assert len(settings.HMAC_SECRET_KEY) >= 32

def test_tamper_evident_audit_log(test_db_session):
    log = log_audit_event(
        test_db_session,
        action="TEST_ACTION",
        target_type="System",
        target_id="sys_1",
        details="Security integrity check test",
        actor="admin",
        result="SUCCESS"
    )
    assert log.id is not None
    assert len(log.hmac_signature) == 64

    # Verify signature
    canonical = f"{log.id}|{format_canonical_timestamp(log.timestamp)}|{log.action}|{log.target_type}|{log.target_id}|{log.result}"
    assert verify_hmac(canonical, log.hmac_signature) is True

    # Check that altering the audit log in DB invalidates signature
    log.action = "TAMPERED_ACTION"
    canonical_tampered = f"{log.id}|{format_canonical_timestamp(log.timestamp)}|{log.action}|{log.target_type}|{log.target_id}|{log.result}"
    assert verify_hmac(canonical_tampered, log.hmac_signature) is False
