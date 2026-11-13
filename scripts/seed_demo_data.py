import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta

# Add backend to sys.path ahead of any other paths
root_dir = Path(__file__).resolve().parent.parent
backend_dir = root_dir / "backend"
backend_str = str(backend_dir)
if backend_str in sys.path:
    sys.path.remove(backend_str)
sys.path.insert(0, backend_str)

# If an 'app' package was already imported from another project on sys.path, unload it
if "app" in sys.modules:
    app_file = getattr(sys.modules["app"], "__file__", "")
    if app_file and not app_file.startswith(backend_str):
        for mod_name in list(sys.modules.keys()):
            if mod_name == "app" or mod_name.startswith("app."):
                del sys.modules[mod_name]

from app.database.session import SessionLocal, Base, engine
from app.database.models import (
    MonitoredDirectory, IntegrityBaseline, BaselineFile,
    SecurityEvent, SecurityAlert, AuditLog, utc_now
)
from app.baseline.service import create_directory_baseline
from app.alerts.alert_service import create_alert_for_event, update_alert
from app.core.audit import log_audit_event

def seed_demo_environment():
    print("[*] Initializing FileWatch database...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    demo_dir_path = root_dir / "data" / "demo_monitored_assets"
    demo_dir_path.mkdir(parents=True, exist_ok=True)

    # Create realistic target files
    (demo_dir_path / "server_config.ini").write_text("[security]\nauth_mode=mfa\ntls_version=1.3\nport=8443\n", encoding="utf-8")
    (demo_dir_path / "database.env").write_text("DB_HOST=127.0.0.1\nDB_PORT=5432\nDB_POOL=20\n", encoding="utf-8")
    (demo_dir_path / "integrity_service.py").write_text("# Core daemon file\nprint('FIM service operational')\n", encoding="utf-8")
    (demo_dir_path / "agent_binary.exe").write_bytes(b"\x4d\x5a\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff")
    sub_docs = demo_dir_path / "docs"
    sub_docs.mkdir(exist_ok=True)
    (sub_docs / "incident_response_playbook.md").write_text("# Incident Response Guide\nLevel 1: Triage alert\nLevel 2: Forensic snapshot\n", encoding="utf-8")

    # Check if directory already registered
    existing_dir = db.query(MonitoredDirectory).filter(MonitoredDirectory.path == str(demo_dir_path.resolve())).first()
    if not existing_dir:
        print("[*] Registering demo directory...")
        directory = MonitoredDirectory(
            path=str(demo_dir_path.resolve()),
            label="Production Assets & Binaries",
            recursive=True,
            include_extensions=[],
            exclude_extensions=[".tmp", ".bak"],
            exclude_subdirectories=[".git", "node_modules"],
            max_file_size_mb=50,
            is_active=True,
            status="active"
        )
        db.add(directory)
        db.commit()
        db.refresh(directory)

        print("[*] Creating cryptographic initial baseline...")
        baseline = create_directory_baseline(
            db=db,
            directory=directory,
            name="Baseline v1.0 — Production Release",
            description="Initial baseline created during deployment onboarding."
        )

        print("[*] Seeding simulated security events...")
        # 1. Critical event: unauthorized script dropped
        event1 = SecurityEvent(
            timestamp=utc_now() - timedelta(minutes=45),
            directory_id=directory.id,
            directory_path=directory.path,
            relative_path="unauthorized_reverse_shell.ps1",
            file_name="unauthorized_reverse_shell.ps1",
            event_type="FILE_CREATED",
            severity="CRITICAL",
            current_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
            details="New executable or script (.ps1) dropped into monitored directory.",
            verification_status="event_only",
            baseline_id=baseline.id,
            investigation_status="investigating"
        )
        db.add(event1)
        db.commit()
        db.refresh(event1)
        alert1 = create_alert_for_event(db, event1)
        if alert1:
            update_alert(
                db,
                alert1.id,
                notes="Investigating unauthorized PowerShell artifact discovered in root directory."
            )

        # 2. High event: config file modified
        event2 = SecurityEvent(
            timestamp=utc_now() - timedelta(minutes=15),
            directory_id=directory.id,
            directory_path=directory.path,
            relative_path="server_config.ini",
            file_name="server_config.ini",
            event_type="FILE_MODIFIED",
            severity="HIGH",
            previous_hash="a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0",
            current_hash="b2c3d4e5f6a17890123456789abcdef0123456789abcdef0123456789abcdef1",
            details="Security-sensitive configuration file (server_config.ini) modified. Potential configuration tampering.",
            verification_status="confirmed_by_scan",
            baseline_id=baseline.id,
            investigation_status="new"
        )
        db.add(event2)
        db.commit()
        db.refresh(event2)
        create_alert_for_event(db, event2)

        # 3. Informational verified event
        event3 = SecurityEvent(
            timestamp=utc_now() - timedelta(minutes=5),
            directory_id=directory.id,
            directory_path=directory.path,
            relative_path="integrity_service.py",
            file_name="integrity_service.py",
            event_type="INTEGRITY_VERIFIED",
            severity="INFORMATIONAL",
            details="Integrity verified for integrity_service.py.",
            verification_status="confirmed_by_scan",
            baseline_id=baseline.id,
            investigation_status="resolved"
        )
        db.add(event3)
        db.commit()

        print("[+] Demo data successfully seeded!")
        print(f"    Monitored Directory: {directory.path}")
        print(f"    Baseline ID: {baseline.id}")
        print(f"    Total Baseline Files: {baseline.file_count}")
    else:
        print("[*] Demo directory already registered.")

    db.close()

if __name__ == "__main__":
    seed_demo_environment()

