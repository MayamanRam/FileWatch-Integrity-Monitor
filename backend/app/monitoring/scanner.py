import time
import threading
import logging
from typing import Optional
from sqlalchemy.orm import Session

logger = logging.getLogger("filewatch.scanner")
from app.database.session import SessionLocal
from app.database.models import MonitoredDirectory, IntegrityBaseline, SecurityEvent, SecurityAlert, utc_now
from app.baseline.service import verify_directory_against_baseline
from app.alerts.alert_service import create_alert_for_event
from app.core.config import settings

class PeriodicIntegrityScanner:
    """
    Background worker that runs periodic complete scans of all monitored directories,
    ensuring that any change missed by OS filesystem event hooks is caught.
    """
    def __init__(self):
        self._running = False
        self._thread: Optional[threading.Thread] = None

    def start(self):
        if not self._running:
            self._running = True
            self._thread = threading.Thread(target=self._scan_loop, daemon=True)
            self._thread.start()

    def stop(self):
        self._running = False
        if self._thread:
            self._thread.join(timeout=2.0)

    def _scan_loop(self):
        while self._running:
            try:
                self.run_full_verification()
            except Exception as e:
                logger.error("Periodic verification loop error: %s", str(e))
            # Sleep in small increments to allow responsive shutdown
            for _ in range(settings.PERIODIC_SCAN_INTERVAL_SECONDS):
                if not self._running:
                    break
                time.sleep(1)

    def run_full_verification(self):
        db = SessionLocal()
        try:
            active_dirs = db.query(MonitoredDirectory).filter(
                MonitoredDirectory.is_active == True,
                MonitoredDirectory.status == "active"
            ).all()

            for d in active_dirs:
                active_baseline = db.query(IntegrityBaseline).filter(
                    IntegrityBaseline.directory_id == d.id,
                    IntegrityBaseline.is_active == True
                ).first()

                if not active_baseline:
                    continue

                try:
                    res = verify_directory_against_baseline(db, active_baseline.id)
                    # Process any discrepancies found during scan
                    for item in res.discrepancies:
                        event_type = f"FILE_{item.status}"
                        if item.status == "UNCHANGED":
                            continue

                        # Check if already logged recently
                        recent = db.query(SecurityEvent).filter(
                            SecurityEvent.directory_id == d.id,
                            SecurityEvent.relative_path == item.relative_path,
                            SecurityEvent.event_type == event_type,
                            SecurityEvent.current_hash == item.current_hash
                        ).order_by(SecurityEvent.timestamp.desc()).first()

                        if recent:
                            delta = (utc_now() - recent.timestamp).total_seconds()
                            if delta < settings.PERIODIC_SCAN_INTERVAL_SECONDS:
                                continue

                        event = SecurityEvent(
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
                            details=f"Discrepancy verified during scheduled full scan: {item.status}",
                            verification_status="confirmed_by_scan",
                            baseline_id=active_baseline.id,
                            investigation_status="new"
                        )
                        db.add(event)
                        db.commit()
                        db.refresh(event)
                        create_alert_for_event(db, event)

                except Exception as dir_err:
                    logger.warning("Directory verification failed for %s: %s", d.path, str(dir_err))
        finally:
            db.close()

periodic_scanner = PeriodicIntegrityScanner()
