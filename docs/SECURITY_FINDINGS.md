# Security Findings & Remediation Log — FileWatch

## 1. Audit Findings Summary

| Finding ID | Severity | Category | Description | Status | Resolution |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **SEC-FIND-01** | Low | Exception Handling (Bandit B110) | 5 `try-except-pass` blocks detected in config, scanner, and watcher. | **RESOLVED** | Refactored all blocks to explicit structured logging (`logger.debug`, `logger.warning`). Bandit re-scan confirmed 0 issues. |
| **SEC-FIND-02** | Low | Environment / Dependency | Global host Python environment contains older versions of unrelated packages (`aiohttp`, `lxml`). | **DOCUMENTED** | FileWatch does not import or depend on `aiohttp` or `lxml`. Virtual environment usage documented in `DEPLOYMENT_GUIDE.md`. |
| **SEC-FIND-03** | Low | Date Formatting Drift in SQLite | Naive vs UTC ISO string representations in SQLite caused canonical HMAC discrepancy during initial testing. | **RESOLVED** | Implemented `format_canonical_timestamp()` to standardize date strings to `YYYY-MM-DDTHH:MM:SS` across all platforms. |
| **SEC-FIND-04** | Info | Boundary Limitation | Local FIM cannot prevent deception if host kernel or OS root account is compromised. | **DOCUMENTED** | Clear operational disclaimers presented on Dashboard, About page, and PDF compliance reports. |

---

## 2. Resolved Vulnerabilities Detail

### SEC-FIND-01: Bandit B110 Try-Except-Pass Remediation
- **Root Cause**: Handlers for file queue errors and fallback key generation used empty `pass` statements.
- **Remediation**: Added module-level loggers (`filewatch.scanner`, `filewatch.watcher`, `filewatch.config`) to log diagnostic information at appropriate log levels (`DEBUG` and `WARNING`).
- **Verification**: Re-executed `bandit -r backend/app`. Result: 0 issues identified.

### SEC-FIND-03: SQLite Timestamp Canonicalization
- **Root Cause**: SQLite `DateTime` columns return naive datetimes on read, which stripped the `+00:00` suffix present during in-memory creation, causing canonical string mismatch.
- **Remediation**: Added `format_canonical_timestamp()` helper in `app/core/security.py` that normalizes any datetime or ISO string to a deterministic format before computing HMACs.
- **Verification**: `test_tamper_evident_audit_log` and `test_tamper_detection_on_intact_baseline` pass reliably across all platforms.

