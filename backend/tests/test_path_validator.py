import os
from pathlib import Path
from app.monitoring.path_validator import (
    validate_directory_path,
    is_path_excluded,
    is_safe_symlink
)

def test_valid_directory_path(sample_monitored_dir):
    is_valid, err, p = validate_directory_path(str(sample_monitored_dir))
    assert is_valid is True
    assert err is None
    assert p == sample_monitored_dir.resolve()

def test_traversal_detection():
    is_valid, err, _ = validate_directory_path("C:/folder/../../Windows/System32")
    assert is_valid is False
    assert "Path traversal" in err

def test_empty_or_whitespace_path():
    is_valid, err, _ = validate_directory_path("   ")
    assert is_valid is False
    assert "cannot be empty" in err

def test_protected_folders_rejected():
    is_valid, err, _ = validate_directory_path("D:/Projects/CyberRAG-Standalone-v1.1.0")
    assert is_valid is False
    assert "protected folder" in err

    is_valid2, err2, _ = validate_directory_path("D:/Projects/mayamanram-portfolio/sub")
    assert is_valid2 is False
    assert "protected folder" in err2

def test_nonexistent_directory():
    is_valid, err, _ = validate_directory_path("D:/TotallyNonExistentDir_98765")
    assert is_valid is False
    assert "does not exist" in err

def test_path_exclusion_subdirectories(sample_monitored_dir):
    git_file = sample_monitored_dir / ".git" / "config"
    assert is_path_excluded(git_file, sample_monitored_dir) is True

    node_mod = sample_monitored_dir / "node_modules" / "pkg" / "index.js"
    assert is_path_excluded(node_mod, sample_monitored_dir) is True

    normal_file = sample_monitored_dir / "src" / "index.ts"
    assert is_path_excluded(normal_file, sample_monitored_dir) is False

def test_path_exclusion_extensions(sample_monitored_dir):
    log_file = sample_monitored_dir / "app.log"
    assert is_path_excluded(log_file, sample_monitored_dir, exclude_extensions=[".log", ".tmp"]) is True

    txt_file = sample_monitored_dir / "app.txt"
    assert is_path_excluded(txt_file, sample_monitored_dir, exclude_extensions=[".log"]) is False

