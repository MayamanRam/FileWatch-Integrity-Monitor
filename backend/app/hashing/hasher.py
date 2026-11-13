import os
import stat
import hashlib
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from app.core.config import settings

class FileHashResult:
    def __init__(
        self,
        file_path: Path,
        relative_path: str,
        sha256_hash: str,
        file_size: int,
        created_time: datetime,
        modified_time: datetime,
        permissions: str,
        file_type: str,
        error: Optional[str] = None
    ):
        self.file_path = file_path
        self.relative_path = relative_path
        self.sha256_hash = sha256_hash
        self.file_size = file_size
        self.created_time = created_time
        self.modified_time = modified_time
        self.permissions = permissions
        self.file_type = file_type
        self.error = error

    def to_dict(self) -> Dict[str, Any]:
        return {
            "relative_path": self.relative_path,
            "file_name": self.file_path.name,
            "sha256_hash": self.sha256_hash,
            "file_size": self.file_size,
            "created_time": self.created_time.isoformat(),
            "modified_time": self.modified_time.isoformat(),
            "permissions": self.permissions,
            "file_type": self.file_type,
            "error": self.error
        }

def determine_file_type(file_path: Path) -> str:
    """Classify file category based on extension and attributes."""
    name = file_path.name.lower()
    if name in [".env", ".gitignore", ".dockerignore"] or name.startswith(".env."):
        return "config"
    ext = file_path.suffix.lower()
    if ext in settings.CRITICAL_EXTENSIONS:
        return "executable"
    if ext in settings.HIGH_RISK_EXTENSIONS:
        return "config"
    if ext in [".txt", ".md", ".csv", ".log", ".py", ".js", ".ts", ".html", ".css"]:
        return "text"
    if ext in [".png", ".jpg", ".jpeg", ".gif", ".pdf", ".zip", ".tar", ".gz"]:
        return "binary"
    return "unknown"

def hash_file_streaming(
    file_path: Path,
    base_dir: Optional[Path] = None,
    chunk_size: int = settings.HASH_CHUNK_SIZE_BYTES,
    max_size_bytes: int = settings.MAX_FILE_SIZE_BYTES
) -> Tuple[Optional[FileHashResult], Optional[str]]:
    """
    Safely compute SHA-256 hash using streaming buffer reads.
    Handles files that change during read, permission denials, zero-length files,
    and size limit exceptions.
    """
    try:
        resolved_path = file_path.resolve()
        if not resolved_path.exists():
            return None, f"File not found: {file_path}"
        if resolved_path.is_dir():
            return None, f"Path is a directory, not a file: {file_path}"

        # Get initial file stats
        st = resolved_path.stat()
        file_size = st.st_size

        if file_size > max_size_bytes:
            return None, f"File exceeds maximum allowed size ({file_size} > {max_size_bytes} bytes)"

        # Permission string
        mode = st.st_mode
        perms = oct(stat.S_IMODE(mode))

        # Times
        mtime = datetime.fromtimestamp(st.st_mtime, timezone.utc)
        try:
            ctime = datetime.fromtimestamp(st.st_ctime, timezone.utc)
        except Exception:
            ctime = mtime

        sha256_ctx = hashlib.sha256()
        bytes_read = 0

        with open(resolved_path, "rb") as f:
            while True:
                chunk = f.read(chunk_size)
                if not chunk:
                    break
                sha256_ctx.update(chunk)
                bytes_read += len(chunk)

        # Check if file changed while reading
        st_after = resolved_path.stat()
        if st_after.st_size != file_size or st_after.st_mtime != st.st_mtime:
            # File modified during hash read - retry once
            sha256_ctx = hashlib.sha256()
            file_size = st_after.st_size
            mtime = datetime.fromtimestamp(st_after.st_mtime, timezone.utc)
            with open(resolved_path, "rb") as f:
                while True:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    sha256_ctx.update(chunk)

        final_hash = sha256_ctx.hexdigest()

        # Compute relative path
        if base_dir:
            try:
                rel_path = resolved_path.relative_to(base_dir.resolve()).as_posix()
            except ValueError:
                rel_path = resolved_path.name
        else:
            rel_path = resolved_path.name

        file_type = determine_file_type(resolved_path)

        result = FileHashResult(
            file_path=resolved_path,
            relative_path=rel_path,
            sha256_hash=final_hash,
            file_size=file_size,
            created_time=ctime,
            modified_time=mtime,
            permissions=perms,
            file_type=file_type
        )
        return result, None

    except PermissionError:
        return None, f"Permission denied accessing: {file_path}"
    except Exception as e:
        return None, f"Error hashing file {file_path}: {str(e)}"
