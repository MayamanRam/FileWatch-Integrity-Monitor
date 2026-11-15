# Security Requirements Specification — FileWatch

## 1. Compliance & Security Framework Alignment

| Framework | Requirement Reference | Implementation in FileWatch |
| :--- | :--- | :--- |
| **NIST SP 800-53 Rev 5** | **SI-7: Software, Firmware, & Information Integrity** | Cryptographic SHA-256 baselines and periodic reconciliation scans to detect unauthorized file changes. |
| **PCI-DSS v4.0** | **Req 11.5: File Integrity Monitoring** | Automated alerting on unauthorized modifications of system binaries and critical configuration files. |
| **CIS Controls v8** | **Control 8.4: Deploy Host-Based Integrity Monitoring** | Continuous real-time filesystem change detection and tamper-evident audit logs. |
| **OWASP ASVS 4.0** | **V10.3: Integrity Verification** | HMAC-SHA256 digital seals on baseline records to prevent database record modification. |

---

## 2. Security Controls & Functional Enforcement

### 2.1 Filesystem Scope Boundaries
- **Path Traversal Defenses**: Strictly reject path sequences containing `..` or non-normalized paths.
- **Root Protection**: Forbid registering entire root drives (`C:\` or `/`) to prevent accidental scanning of operating system memory pages or swap files.
- **Symlink Escape Prevention**: Verify symbolic links and ensure their targets resolve strictly within the authorized directory boundary.

### 2.2 Cryptographic Integrity
- **SHA-256 Hashing**: Standardized algorithm with 256 bits of collision resistance.
- **HMAC Signatures**: Baseline metadata and audit log entries are sealed using HMAC-SHA256. Secret keys are loaded from environment variables or from filesystem-isolated key files (`data/.hmac_key`).
- **Constant-Time Verification**: Verification uses `hmac.compare_digest` to prevent timing attack side-channels.

### 2.3 Application & API Security
- **Strict Input Schemas**: Pydantic models validate and sanitize all payload structures.
- **CORS Policies**: Explicit origin allowlists restrict cross-origin browser interactions.
- **Error Obfuscation**: Generic 500 error handlers prevent stack trace leakage to API consumers.
- **No Remediation Policy**: System does not delete or overwrite files to preserve evidentiary chain-of-custody for incident responders.

