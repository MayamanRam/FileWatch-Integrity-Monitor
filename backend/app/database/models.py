import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship, Mapped
from app.database.session import Base

def generate_uuid() -> str:
    return str(uuid.uuid4())

def utc_now() -> datetime:
    return datetime.now(timezone.utc)

class MonitoredDirectory(Base):
    __tablename__ = "monitored_directories"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    path = Column(String(1024), unique=True, nullable=False, index=True)
    label = Column(String(255), nullable=False)
    recursive = Column(Boolean, default=True, nullable=False)
    include_extensions = Column(JSON, default=list, nullable=False)
    exclude_extensions = Column(JSON, default=list, nullable=False)
    exclude_subdirectories = Column(JSON, default=list, nullable=False)
    max_file_size_mb = Column(Integer, default=50, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    status = Column(String(50), default="active", nullable=False)
    last_scanned_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    baselines = relationship("IntegrityBaseline", back_populates="directory", cascade="all, delete-orphan")
    events = relationship("SecurityEvent", back_populates="directory", cascade="all, delete-orphan")

class IntegrityBaseline(Base):
    __tablename__ = "integrity_baselines"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    directory_id = Column(String(36), ForeignKey("monitored_directories.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    file_count = Column(Integer, default=0, nullable=False)
    total_size_bytes = Column(Integer, default=0, nullable=False)
    baseline_hash = Column(String(64), nullable=False)  # Aggregate SHA-256 of all file hashes
    hmac_signature = Column(String(64), nullable=False)  # Tamper-evident HMAC signature
    is_active = Column(Boolean, default=True, nullable=False)
    tamper_status = Column(String(50), default="VALID", nullable=False)  # VALID, TAMPERED, UNVERIFIED
    created_at = Column(DateTime, default=utc_now, nullable=False)

    directory = relationship("MonitoredDirectory", back_populates="baselines")
    files = relationship("BaselineFile", back_populates="baseline", cascade="all, delete-orphan")

class BaselineFile(Base):
    __tablename__ = "baseline_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    baseline_id = Column(String(36), ForeignKey("integrity_baselines.id", ondelete="CASCADE"), nullable=False, index=True)
    directory_id = Column(String(36), nullable=False)
    relative_path = Column(String(1024), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_size = Column(Integer, nullable=False)
    sha256_hash = Column(String(64), nullable=False, index=True)
    file_type = Column(String(50), default="unknown", nullable=False)
    file_permissions = Column(String(50), default="", nullable=False)
    created_time = Column(DateTime, nullable=True)
    modified_time = Column(DateTime, nullable=False)
    record_hmac = Column(String(64), nullable=False)

    baseline = relationship("IntegrityBaseline", back_populates="files")

class SecurityEvent(Base):
    __tablename__ = "security_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    directory_id = Column(String(36), ForeignKey("monitored_directories.id", ondelete="CASCADE"), nullable=True)
    directory_path = Column(String(1024), nullable=False)
    relative_path = Column(String(1024), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    event_type = Column(String(50), nullable=False, index=True)
    # Types: FILE_CREATED, FILE_MODIFIED, FILE_DELETED, FILE_RENAMED, METADATA_CHANGED, PERMISSION_CHANGED, INTEGRITY_VERIFIED, BASELINE_TAMPERING_SUSPECTED, MONITORING_ERROR
    severity = Column(String(20), nullable=False, index=True)
    # Severity: CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    previous_hash = Column(String(64), nullable=True)
    current_hash = Column(String(64), nullable=True)
    previous_metadata = Column(JSON, default=dict, nullable=False)
    current_metadata = Column(JSON, default=dict, nullable=False)
    details = Column(Text, default="")
    verification_status = Column(String(50), default="unverified", nullable=False)  # unverified, confirmed_by_scan, event_only
    baseline_id = Column(String(36), nullable=True)
    investigation_status = Column(String(50), default="new", nullable=False)  # new, investigating, resolved, false_positive

    directory = relationship("MonitoredDirectory", back_populates="events")
    alerts = relationship("SecurityAlert", back_populates="event", cascade="all, delete-orphan")

class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id: Mapped[str] = Column(String(36), primary_key=True, default=generate_uuid)
    event_id: Mapped[Optional[str]] = Column(String(36), ForeignKey("security_events.id", ondelete="SET NULL"), nullable=True)
    title: Mapped[str] = Column(String(255), nullable=False)
    description: Mapped[str] = Column(Text, nullable=False)
    severity: Mapped[str] = Column(String(20), nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL
    status: Mapped[str] = Column(String(50), default="open", nullable=False, index=True)  # open, acknowledged, resolved
    investigation_notes: Mapped[str] = Column(Text, default="")
    directory_path: Mapped[str] = Column(String(1024), default="", nullable=False)
    file_path: Mapped[str] = Column(String(1024), default="", nullable=False)
    created_at: Mapped[datetime] = Column(DateTime, default=utc_now, nullable=False, index=True)
    updated_at: Mapped[datetime] = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    acknowledged_at: Mapped[Optional[datetime]] = Column(DateTime, nullable=True)
    resolved_at: Mapped[Optional[datetime]] = Column(DateTime, nullable=True)

    event = relationship("SecurityEvent", back_populates="alerts")

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    timestamp = Column(DateTime, default=utc_now, nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    target_type = Column(String(100), nullable=False)
    target_id = Column(String(255), default="", nullable=False)
    details = Column(Text, default="", nullable=False)
    actor = Column(String(100), default="system", nullable=False)
    result = Column(String(50), default="SUCCESS", nullable=False)  # SUCCESS, FAILURE, WARNING
    hmac_signature = Column(String(64), nullable=False)

