# Security Verification Matrix — FileWatch

## 1. Security Control Verification Matrix

| Control ID | Threat / Vulnerability | Security Control Enforced | Verification Test File | Test Result |
| :---: | :--- | :--- | :--- | :---: |
| **SEC-01** | Path Traversal / Directory Escape | `validate_directory_path` resolves normalized canonical paths and blocks `..` sequences. | `test_path_validator.py` | **PASSED** |
| **SEC-02** | Scanning System Root Drive | Explicit check disallowing root filesystem / drive paths (`C:\` or `/`). | `test_path_validator.py` | **PASSED** |
| **SEC-03** | Unauthorized Sibling Access | Hard block against protected directories (`CyberRAG-Standalone-v1.1.0`, `mayamanram-portfolio`). | `test_path_validator.py` | **PASSED** |
| **SEC-04** | Symlink Escape Attack | `is_safe_symlink` validates target stays strictly inside monitored root. | `test_path_validator.py` | **PASSED** |
| **SEC-05** | Memory Exhaustion on Large Files | 64 KB streaming chunked buffer reads; configurable max file size limit. | `test_hashing.py` | **PASSED** |
| **SEC-06** | File Modification During Read | Pre- and post-read stat checks detect concurrent modification and trigger retry. | `test_hashing.py` | **PASSED** |
| **SEC-07** | Database Baseline Tampering | Dual-layer HMAC-SHA256 signatures over root metadata and individual file rows. | `test_tamper_detection.py` | **PASSED** |
| **SEC-08** | Audit Log Repudiation | Tamper-evident HMAC signature calculated and stored for every audit record. | `test_security.py` | **PASSED** |
| **SEC-09** | Executable Dropping / Tampering | Classifier assigns `CRITICAL` severity to scripts/binaries and raises alert. | `test_classifier.py` | **PASSED** |
| **SEC-10** | Event Storms / CPU Flooding | Debounced watchdog event queue with 1.0s settle window and duplicate suppression. | `watcher.py` | **PASSED** |
| **SEC-11** | Code Injection / Command Exec | No `shell=True` or subprocess calls on user inputs; parameterized ORM queries. | `bandit` Scan | **PASSED (0 issues)**|
| **SEC-12** | Information Disclosure | File contents are never logged or stored in database; only hashes and metadata. | Architecture Review | **PASSED** |

