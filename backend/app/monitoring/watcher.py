import os
import time
import threading
import logging
from pathlib import Path

logger = logging.getLogger("filewatch.watcher")
from typing import Dict, Optional, Tuple, Any
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler, FileSystemEvent

from app.database.session import SessionLocal
from app.database.models import (
    MonitoredDirectory, IntegrityBaseline, BaselineFile,
    SecurityEvent, utc_now
)
from app.hashing.hasher import hash_file_streaming
from app.monitoring.path_validator import is_path_excluded
from app.detection.classifier import classify_event_severity
from app.alerts.alert_service import create_alert_for_event
from app.core.config import settings

class DebouncedFIMHandler(FileSystemEventHandler):
    """
    Filesystem event handler with debouncing and duplicate suppression.
    Avoids processing multiple intermediate OS write bursts.
    """
    def __init__(self, directory_id: str, base_path: str, orchestrator: "MonitoringOrchestrator"):
        super().__init__()
        self.directory_id = directory_id
        self.base_path = Path(base_path).resolve()
        self.orchestrator = orchestrator
        self._pending_events: Dict[str, Tuple[str, float]] = {}  # path -> (event_type, timestamp)
        self._lock = threading.Lock()
        self._running = True
        self._worker_thread = threading.Thread(target=self._process_loop, daemon=True)
        self._worker_thread.start()

    def stop(self):
        self._running = False

    def on_created(self, event: FileSystemEvent):
        if not event.is_directory:
            self._enqueue(event.src_path, "FILE_CREATED")

    def on_modified(self, event: FileSystemEvent):
        if not event.is_directory:
            self._enqueue(event.src_path, "FILE_MODIFIED")

    def on_deleted(self, event: FileSystemEvent):
        if not event.is_directory:
            self._enqueue(event.src_path, "FILE_DELETED")

    def on_moved(self, event: FileSystemEvent):
        if not event.is_directory:
            # Source deleted / moved away
            self._enqueue(event.src_path, "FILE_DELETED")
            # Destination created
            if hasattr(event, "dest_path") and event.dest_path:
                self._enqueue(event.dest_path, "FILE_RENAMED")

    def _enqueue(self, raw_path: str, event_type: str):
        try:
            fp = Path(raw_path).resolve()
            # Fast check if path is excluded
            if is_path_excluded(fp, self.base_path):
                return
            with self._lock:
                self._pending_events[str(fp)] = (event_type, time.time())
        except Exception as queue_err:
            logger.debug("Failed to enqueue path %s: %s", raw_path, str(queue_err))

    def _process_loop(self):
        debounce_window = settings.EVENT_DEBOUNCE_SECONDS
        while self._running:
            time.sleep(0.5)
            now = time.time()
            to_process = []

            with self._lock:
                paths_to_delete = []
                for path_str, (event_type, event_time) in self._pending_events.items():
                    if now - event_time >= debounce_window:
                        to_process.append((path_str, event_type))
                        paths_to_delete.append(path_str)
                for p in paths_to_delete:
                    del self._pending_events[p]

            for path_str, event_type in to_process:
                try:
                    self.orchestrator.handle_filesystem_change(self.directory_id, path_str, event_type)
                except Exception as e:
                    logger.error("Error processing filesystem change for %s: %s", path_str, str(e))

class MonitoringOrchestrator:
    """
    Manages active Watchdog observer instances for all registered directories.
    """
    def __init__(self):
        self._observers: Dict[str, Tuple[Observer, DebouncedFIMHandler]] = {}
        self._lock = threading.Lock()

    def start_monitoring_directory(self, directory_id: str, path: str, recursive: bool = True):
        with self._lock:
            if directory_id in self._observers:
                return  # Already monitoring

            p = Path(path).resolve()
            if not p.exists() or not p.is_dir():
                return

            handler = DebouncedFIMHandler(directory_id, str(p), self)
            observer = Observer()
            observer.schedule(handler, str(p), recursive=recursive)
            observer.start()
            self._observers[directory_id] = (observer, handler)

    def stop_monitoring_directory(self, directory_id: str):
        with self._lock:
            if directory_id in self._observers:
                observer, handler = self._observers.pop(directory_id)
                handler.stop()
                observer.stop()
                observer.join(timeout=2.0)

    def stop_all(self):
        with self._lock:
            for directory_id in list(self._observers.keys()):
                observer, handler = self._observers.pop(directory_id)
                handler.stop()
                observer.stop()
                observer.join(timeout=1.0)

    def is_monitoring(self, directory_id: str) -> bool:
        with self._lock:
            return directory_id in self._observers

    def handle_filesystem_change(self, directory_id: str, file_path_str: str, event_type: str):
        """
        Processes a debounced filesystem change, recalculates cryptographic hash,
        evaluates against active baseline, and records event & alert.
        """
        db = SessionLocal()
        try:
            directory = db.query(MonitoredDirectory).filter(MonitoredDirectory.id == directory_id).first()
            if not directory or not directory.is_active:
                return

            base_path = Path(directory.path).resolve()
            fp = Path(file_path_str).resolve()

            try:
                rel_path = fp.relative_to(base_path).as_posix()
            except ValueError:
                rel_path = fp.name

            # Check if excluded
            if is_path_excluded(
                fp,
                base_path,
                include_extensions=directory.include_extensions,
                exclude_extensions=directory.exclude_extensions,
                exclude_subdirectories=directory.exclude_subdirectories
            ):
                return

            # Check active baseline
            active_baseline = db.query(IntegrityBaseline).filter(
                IntegrityBaseline.directory_id == directory_id,
                IntegrityBaseline.is_active == True
            ).first()

            baseline_file = None
            if active_baseline:
                baseline_file = db.query(BaselineFile).filter(
                    BaselineFile.baseline_id == active_baseline.id,
                    BaselineFile.relative_path == rel_path
                ).first()

            current_hash = None
            current_metadata: Dict[str, Any] = {}
            previous_hash = baseline_file.sha256_hash if baseline_file else None
            previous_metadata = {
                "size": baseline_file.file_size,
                "modified": baseline_file.modified_time.isoformat(),
                "permissions": baseline_file.file_permissions
            } if baseline_file else {}

            if event_type in ["FILE_CREATED", "FILE_MODIFIED", "FILE_RENAMED"]:
                if fp.exists() and fp.is_file():
                    h_res, err = hash_file_streaming(
                        fp,
                        base_dir=base_path,
                        max_size_bytes=directory.max_file_size_mb * 1024 * 1024
                    )
                    if h_res:
                        current_hash = h_res.sha256_hash
                        current_metadata = {
                            "size": h_res.file_size,
                            "modified": h_res.modified_time.isoformat(),
                            "permissions": h_res.permissions,
                            "file_type": h_res.file_type
                        }
                        # If hash is identical to baseline, it's just a timestamp/metadata touch
                        if baseline_file and current_hash == baseline_file.sha256_hash:
                            event_type = "METADATA_CHANGED"
                else:
                    event_type = "FILE_DELETED"

            severity, reason = classify_event_severity(
                event_type=event_type,
                file_path=str(fp),
                previous_hash=previous_hash,
                current_hash=current_hash,
                previous_size=previous_metadata.get("size"),
                current_size=current_metadata.get("size")
            )

            # Avoid spamming duplicate identical events within 5 seconds
            recent_duplicate = db.query(SecurityEvent).filter(
                SecurityEvent.directory_id == directory_id,
                SecurityEvent.relative_path == rel_path,
                SecurityEvent.event_type == event_type,
                SecurityEvent.current_hash == current_hash
            ).order_by(SecurityEvent.timestamp.desc()).first()

            if recent_duplicate:
                delta = (utc_now() - recent_duplicate.timestamp).total_seconds()
                if delta < 5.0:
                    return  # Suppress duplicate event

            sec_event = SecurityEvent(
                timestamp=utc_now(),
                directory_id=directory_id,
                directory_path=str(base_path),
                relative_path=rel_path,
                file_name=fp.name,
                event_type=event_type,
                severity=severity,
                previous_hash=previous_hash,
                current_hash=current_hash,
                previous_metadata=previous_metadata,
                current_metadata=current_metadata,
                details=reason,
                verification_status="event_only",
                baseline_id=active_baseline.id if active_baseline else None,
                investigation_status="new"
            )
            db.add(sec_event)
            db.commit()
            db.refresh(sec_event)

            # Check if alert should be triggered
            create_alert_for_event(db, sec_event)

        finally:
            db.close()

monitoring_orchestrator = MonitoringOrchestrator()
