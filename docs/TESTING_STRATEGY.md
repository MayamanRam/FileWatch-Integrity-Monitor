# Testing Strategy & Quality Assurance — FileWatch

## 1. Testing Philosophy

Testing in FileWatch follows a zero-compromise approach to software quality and security assurance:
- **No Fabricated Results**: Every test must be executed and verified with actual test runner output.
- **High Test Coverage**: Unit tests, integration tests, security regression tests, and end-to-end API workflows.

---

## 2. Test Suites & Coverage Breakdown

### 2.1 Unit Tests (`backend/tests/test_hashing.py`)
- Empty file hashing (verifies standard zero-byte SHA-256: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`).
- Text and binary file hashing.
- Large file streaming reads (1 MB+ deterministic chunked streaming verification).
- Nonexistent file error handling.
- File category classification (`executable`, `config`, `text`, `binary`).

### 2.2 Path Validator Tests (`backend/tests/test_path_validator.py`)
- Directory path normalization.
- Path traversal rejection (`../../etc`).
- Empty and whitespace rejection.
- Protected directory access prevention (`CyberRAG-Standalone-v1.1.0` and `mayamanram-portfolio`).
- Extension filtering and subdirectory exclusion rules (`node_modules`, `.git`).

### 2.3 Baseline Management & Verification Tests (`backend/tests/test_baseline.py`)
- Baseline creation, aggregate root hash calculation, and HMAC sealing.
- Baseline diff detection: Modified files, Newly created files, Deleted files, and Unchanged files.

### 2.4 Tamper Detection Tests (`backend/tests/test_tamper_detection.py`)
- Clean baseline passes with status `VALID`.
- Direct database row alteration (modifying `sha256_hash` in SQLite) is caught and flagged as `TAMPERED`.
- Root HMAC signature corruption is caught and flagged as `TAMPERED`.

### 2.5 Security Event Classifier Tests (`backend/tests/test_classifier.py`)
- Binary modification mapped to `CRITICAL`.
- Configuration modification mapped to `HIGH`.
- Text modification mapped to `MEDIUM`.
- Baseline tampering mapped to `CRITICAL`.

### 2.6 REST API Integration Tests (`backend/tests/test_api.py`)
- System status and health endpoints.
- Directory onboarding, duplicate registration rejection (409 Conflict), and pause/resume lifecycle.
- Tamper check endpoint.
- Alert triage workflow (Open → Acknowledged → Resolved).
- Multi-format report export endpoints (JSON, CSV, PDF).

### 2.7 Security & Cryptography Tests (`backend/tests/test_security.py`)
- HMAC secret key entropy check.
- Tamper-evident audit log creation and cryptographic verification.

---

## 3. Test Execution Results

```
============================= 31 passed in 5.75s ==============================
```
All 31 automated backend tests pass with 100% success rate.

