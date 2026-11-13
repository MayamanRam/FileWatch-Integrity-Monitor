from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

# Directory schemas
class DirectoryBase(BaseModel):
    path: str
    label: str
    recursive: bool = True
    include_extensions: List[str] = Field(default_factory=list)
    exclude_extensions: List[str] = Field(default_factory=list)
    exclude_subdirectories: List[str] = Field(default_factory=list)
    max_file_size_mb: int = Field(default=50, ge=1, le=1000)

class DirectoryCreate(DirectoryBase):
    pass

class DirectoryUpdate(BaseModel):
    label: Optional[str] = None
    recursive: Optional[bool] = None
    include_extensions: Optional[List[str]] = None
    exclude_extensions: Optional[List[str]] = None
    exclude_subdirectories: Optional[List[str]] = None
    max_file_size_mb: Optional[int] = Field(default=None, ge=1, le=1000)
    is_active: Optional[bool] = None

class DirectoryResponse(DirectoryBase):
    id: str
    is_active: bool
    status: str
    last_scanned_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    file_count: Optional[int] = 0
    active_baseline_id: Optional[str] = None

    class Config:
        from_attributes = True

# Baseline schemas
class BaselineCreate(BaseModel):
    directory_id: str
    name: str
    description: Optional[str] = ""

class BaselineFileResponse(BaseModel):
    id: str
    relative_path: str
    file_name: str
    file_size: int
    sha256_hash: str
    file_type: str
    file_permissions: str
    modified_time: datetime

    class Config:
        from_attributes = True

class BaselineResponse(BaseModel):
    id: str
    directory_id: str
    name: str
    description: str
    file_count: int
    total_size_bytes: int
    baseline_hash: str
    is_active: bool
    tamper_status: str
    created_at: datetime

    class Config:
        from_attributes = True

class BaselineDetailResponse(BaselineResponse):
    files: List[BaselineFileResponse] = Field(default_factory=list)

class BaselineDiffItem(BaseModel):
    relative_path: str
    status: str  # NEW, MODIFIED, DELETED, UNCHANGED, METADATA_CHANGED
    previous_hash: Optional[str] = None
    current_hash: Optional[str] = None
    previous_size: Optional[int] = None
    current_size: Optional[int] = None
    severity: str = "INFORMATIONAL"

class BaselineVerificationResult(BaseModel):
    baseline_id: str
    directory_id: str
    directory_path: str
    verified_at: datetime
    total_baseline_files: int
    current_disk_files: int
    unchanged_files: int
    modified_files: int
    new_files: int
    deleted_files: int
    tamper_status: str
    discrepancies: List[BaselineDiffItem] = Field(default_factory=list)

class BaselineTamperCheckResult(BaseModel):
    baseline_id: str
    name: str
    is_tampered: bool
    status: str  # VALID, TAMPERED
    root_hmac_valid: bool
    tampered_file_records: List[str] = Field(default_factory=list)
    message: str

# Security Event schemas
class SecurityEventResponse(BaseModel):
    id: str
    timestamp: datetime
    directory_id: Optional[str]
    directory_path: str
    relative_path: str
    file_name: str
    event_type: str
    severity: str
    previous_hash: Optional[str]
    current_hash: Optional[str]
    previous_metadata: Dict[str, Any]
    current_metadata: Dict[str, Any]
    details: str
    verification_status: str
    baseline_id: Optional[str]
    investigation_status: str

    class Config:
        from_attributes = True

# Security Alert schemas
class SecurityAlertResponse(BaseModel):
    id: str
    event_id: Optional[str]
    title: str
    description: str
    severity: str
    status: str
    investigation_notes: str
    directory_path: str
    file_path: str
    created_at: datetime
    updated_at: datetime
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True

class AlertUpdate(BaseModel):
    status: Optional[str] = None  # open, acknowledged, resolved
    investigation_notes: Optional[str] = None

# Audit Log schemas
class AuditLogResponse(BaseModel):
    id: str
    timestamp: datetime
    action: str
    target_type: str
    target_id: str
    details: str
    actor: str
    result: str
    hmac_signature: str

    class Config:
        from_attributes = True

# System Status & Metrics
class SystemStatusResponse(BaseModel):
    system_status: str  # OPERATIONAL, DEGRADED, STOPPED
    is_monitoring_active: bool
    monitored_directories_count: int
    active_baselines_count: int
    total_monitored_files: int
    open_alerts_count: int
    critical_alerts_count: int
    events_last_24h: int
    last_verification_time: Optional[datetime]
    baseline_tamper_detected: bool

# Report Generation
class ReportExportRequest(BaseModel):
    format: str = "json"  # json, csv, pdf
    directory_id: Optional[str] = None
    severity: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

