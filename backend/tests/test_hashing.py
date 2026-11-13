import hashlib
from pathlib import Path
from app.hashing.hasher import hash_file_streaming, determine_file_type

def test_empty_file_hashing(sample_monitored_dir):
    empty_f = sample_monitored_dir / "empty.txt"
    empty_f.write_bytes(b"")
    
    res, err = hash_file_streaming(empty_f, base_dir=sample_monitored_dir)
    assert err is None
    assert res is not None
    # SHA-256 of empty content is e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    assert res.sha256_hash == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    assert res.file_size == 0
    assert res.relative_path == "empty.txt"

def test_text_and_binary_hashing(sample_monitored_dir):
    txt_f = sample_monitored_dir / "app.py"
    res, err = hash_file_streaming(txt_f, base_dir=sample_monitored_dir)
    assert err is None
    assert res is not None
    assert len(res.sha256_hash) == 64
    assert res.file_size > 0
    assert res.relative_path == "app.py"

    bin_f = sample_monitored_dir / "payload.exe"
    b_res, b_err = hash_file_streaming(bin_f, base_dir=sample_monitored_dir)
    assert b_err is None
    assert b_res is not None
    assert b_res.file_type == "executable"

def test_large_file_streaming_hash(sample_monitored_dir):
    large_f = sample_monitored_dir / "large.bin"
    # Write 1MB of deterministic bytes
    data = b"FILEWATCH_INTEGRITY_CHECK_" * 38400
    large_f.write_bytes(data)

    expected_hash = hashlib.sha256(data).hexdigest()
    res, err = hash_file_streaming(large_f, base_dir=sample_monitored_dir, chunk_size=8192)
    assert err is None
    assert res is not None
    assert res.sha256_hash == expected_hash
    assert res.file_size == len(data)

def test_nonexistent_file():
    p = Path("nonexistent_file_path_12345.xyz")
    res, err = hash_file_streaming(p)
    assert res is None
    assert "File not found" in err

def test_file_type_determination():
    assert determine_file_type(Path("binary.exe")) == "executable"
    assert determine_file_type(Path("script.ps1")) == "executable"
    assert determine_file_type(Path(".env")) == "config"
    assert determine_file_type(Path("settings.json")) == "config"
    assert determine_file_type(Path("readme.md")) == "text"
    assert determine_file_type(Path("image.png")) == "binary"

