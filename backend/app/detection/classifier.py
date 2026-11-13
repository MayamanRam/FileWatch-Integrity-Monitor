from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from app.core.config import settings
from app.hashing.hasher import determine_file_type

def classify_event_severity(
    event_type: str,
    file_path: str,
    previous_hash: Optional[str] = None,
    current_hash: Optional[str] = None,
    previous_size: Optional[int] = None,
    current_size: Optional[int] = None
) -> Tuple[str, str]:
    """
    Classify severity and generate descriptive security context.
    Returns: (severity, reason)
    """
    if event_type == "BASELINE_TAMPERING_SUSPECTED":
        return "CRITICAL", "Cryptographic signature mismatch on baseline integrity database records."

    p = Path(file_path)
    file_type = determine_file_type(p)
    ext = p.suffix.lower()

    if event_type == "FILE_MODIFIED":
        if file_type == "executable":
            return "CRITICAL", f"Executable binary or script ({ext}) modified unexpectedly. Potential code execution tamper."
        if file_type == "config":
            return "HIGH", f"Security-sensitive configuration file ({p.name}) modified. Potential configuration tampering."
        return "MEDIUM", f"File {p.name} content modified."

    elif event_type == "FILE_CREATED":
        if file_type == "executable":
            return "CRITICAL", f"New executable or script ({ext}) dropped into monitored directory."
        if file_type == "config":
            return "HIGH", f"New configuration file ({p.name}) created."
        return "MEDIUM", f"New file {p.name} created."

    elif event_type == "FILE_DELETED":
        if file_type in ["executable", "config"]:
            return "HIGH", f"Protected {file_type} file ({p.name}) deleted."
        return "LOW", f"File {p.name} deleted."

    elif event_type == "FILE_RENAMED":
        if file_type == "executable":
            return "CRITICAL", f"Executable file renamed to {p.name}."
        return "MEDIUM", f"File renamed to {p.name}."

    elif event_type == "METADATA_CHANGED":
        return "LOW", f"Metadata or timestamp touched on {p.name} with content unchanged."

    elif event_type == "INTEGRITY_VERIFIED":
        return "INFORMATIONAL", f"Integrity verified for {p.name}."

    elif event_type == "MONITORING_ERROR":
        return "HIGH", "Filesystem monitoring encountered an unhandled error or permission denial."

    return "INFORMATIONAL", f"Event observed on {p.name}."

