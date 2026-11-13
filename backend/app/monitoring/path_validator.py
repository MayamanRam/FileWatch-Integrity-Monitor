import os
from pathlib import Path
from typing import Tuple, Optional, List

# Protected paths that must NEVER be registered or monitored
PROTECTED_FOLDER_NAMES = [
    "CyberRAG-Standalone-v1.1.0",
    "mayamanram-portfolio"
]

def validate_directory_path(raw_path: str) -> Tuple[bool, Optional[str], Optional[Path]]:
    """
    Strict validation of a proposed directory for monitoring:
    1. Resolves and normalizes absolute path.
    2. Rejects empty or invalid strings.
    3. Rejects path traversal attempts.
    4. Ensures path exists and is an accessible directory.
    5. Rejects root drive or filesystem root (e.g. C:\\ or /) to prevent runaway OS scans.
    6. Ensures path does not point to protected system or sibling directories.
    7. Tests read permissions.
    """
    if not raw_path or not raw_path.strip():
        return False, "Directory path cannot be empty.", None

    clean_str = raw_path.strip()

    # Reject blatant traversal patterns
    if ".." in clean_str:
        return False, "Path traversal sequence ('..') is not permitted.", None

    try:
        p = Path(clean_str).resolve()
    except Exception as e:
        return False, f"Invalid path syntax: {str(e)}", None

    if not p.is_absolute():
        return False, "Path must be absolute.", None

    # Check root restrictions
    if p == p.parent:  # e.g., C:\ or /
        return False, "Monitoring entire root drive or root filesystem is prohibited for performance and safety.", None

    # Check protected folders before existence check
    for protected in PROTECTED_FOLDER_NAMES:
        if protected in p.parts:
            return False, f"Access to protected folder '{protected}' is strictly denied.", None

    # Check existence
    if not p.exists():
        return False, f"Directory does not exist: {p.as_posix()}", None

    if not p.is_dir():
        return False, f"Path is a file, not a directory: {p.as_posix()}", None

    # Test read permissions
    try:
        # Attempt listing directory contents
        os.listdir(p)
    except PermissionError:
        return False, f"Permission denied: cannot read directory {p.as_posix()}", None
    except Exception as e:
        return False, f"Cannot access directory: {str(e)}", None

    return True, None, p

def is_path_excluded(
    file_path: Path,
    base_dir: Path,
    include_extensions: Optional[List[str]] = None,
    exclude_extensions: Optional[List[str]] = None,
    exclude_subdirectories: Optional[List[str]] = None
) -> bool:
    """
    Check if a file should be excluded from hashing and monitoring based on
    file extension and subdirectory filters.
    """
    try:
        rel_path = file_path.resolve().relative_to(base_dir.resolve())
    except ValueError:
        return True  # Outside base dir -> exclude!

    # Check excluded subdirectories
    subdirs_to_exclude = set(exclude_subdirectories or [
        ".git", "node_modules", "__pycache__", ".venv", "venv", ".idea", ".vscode"
    ])
    for part in rel_path.parts[:-1]:
        if part in subdirs_to_exclude:
            return True

    # Check extensions
    ext = file_path.suffix.lower()

    if exclude_extensions:
        clean_excludes = [e.lower() if e.startswith(".") else f".{e.lower()}" for e in exclude_extensions]
        if ext in clean_excludes:
            return True

    if include_extensions and len(include_extensions) > 0:
        clean_includes = [e.lower() if e.startswith(".") else f".{e.lower()}" for e in include_extensions]
        if ext not in clean_includes:
            return True

    return False

def is_safe_symlink(link_path: Path, base_dir: Path) -> bool:
    """
    Ensure symbolic links do not escape the monitored directory tree.
    """
    if not link_path.is_symlink():
        return True
    try:
        target = link_path.resolve()
        target.relative_to(base_dir.resolve())
        return True
    except (ValueError, RuntimeError):
        return False
