import hmac
import hashlib
from typing import Optional, Dict, Any
from app.core.config import settings

def format_canonical_timestamp(dt: Any) -> str:
    """Standardize datetime to a deterministic string (YYYY-MM-DDTHH:MM:SS) for cross-platform SQLite persistence."""
    if isinstance(dt, str):
        return dt[:19]
    if hasattr(dt, "strftime"):
        return dt.strftime("%Y-%m-%dT%H:%M:%S")
    return str(dt)[:19]

def calculate_hmac(data: str, secret_key: Optional[str] = None) -> str:
    """Calculate HMAC-SHA256 signature for data string using secret key."""
    key = (secret_key or settings.HMAC_SECRET_KEY).encode("utf-8")
    return hmac.new(key, data.encode("utf-8"), hashlib.sha256).hexdigest()

def verify_hmac(data: str, signature: str, secret_key: Optional[str] = None) -> bool:
    """Safely verify HMAC-SHA256 signature using constant-time comparison."""
    if not signature:
        return False
    expected = calculate_hmac(data, secret_key)
    return hmac.compare_digest(expected, signature)

def compute_baseline_record_hmac(
    baseline_id: str,
    relative_path: str,
    sha256_hash: str,
    file_size: int,
    modified_time: Any
) -> str:
    """Compute HMAC for an individual baseline file record."""
    ts_str = format_canonical_timestamp(modified_time)
    canonical_str = f"{baseline_id}|{relative_path}|{sha256_hash}|{file_size}|{ts_str}"
    return calculate_hmac(canonical_str)

def compute_baseline_aggregate_hmac(
    baseline_id: str,
    directory_id: str,
    file_count: int,
    total_size: int,
    root_hash: str,
    created_at: Any
) -> str:
    """Compute HMAC for the root baseline metadata."""
    ts_str = format_canonical_timestamp(created_at)
    canonical_str = f"{baseline_id}|{directory_id}|{file_count}|{total_size}|{root_hash}|{ts_str}"
    return calculate_hmac(canonical_str)

def compute_audit_log_hmac(
    log_id: str,
    timestamp: Any = None,
    action: str = "",
    target_type: str = "",
    target_id: str = "",
    result: str = "",
    timestamp_iso: Any = None
) -> str:
    """Compute HMAC for tamper-evident audit log entries."""
    ts = timestamp if timestamp is not None else timestamp_iso
    ts_str = format_canonical_timestamp(ts)
    canonical_str = f"{log_id}|{ts_str}|{action}|{target_type}|{target_id}|{result}"
    return calculate_hmac(canonical_str)
