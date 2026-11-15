# Threat Model & Risk Analysis — FileWatch

## 1. Threat Modeling Methodology

This threat model follows the Microsoft **STRIDE** methodology (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege) evaluated against FileWatch's operational architecture.

---

## 2. STRIDE Assessment Matrix

| Threat Category | Potential Attack Scenario | Risk Level | Mitigation in FileWatch | Residual Risk |
| :--- | :--- | :---: | :--- | :---: |
| **Spoofing** | Adversary attempts to forge file modification timestamps ("timestomping"). | Low | FileWatch relies on SHA-256 cryptographic hashes for integrity, never on timestamps alone. | Low |
| **Tampering** | Adversary gains access to the SQLite database and modifies baseline file hashes to mask malicious code. | High | **HMAC-SHA256 Seals**: Every baseline and file record is signed with a secret key stored outside the database. Any record alteration triggers `BASELINE_TAMPERING_SUSPECTED`. | Low |
| **Repudiation** | Operator denies acknowledging or resolving a security alert or adding a directory. | Medium | **HMAC-Sealed Audit Trail**: Every operational event is recorded with an immutable HMAC signature in `audit_logs`. | Low |
| **Information Disclosure** | Sensitive file contents are leaked through API responses or export reports. | High | FileWatch processes file contents strictly in memory during hashing; only cryptographic hashes and metadata are stored or exposed in reports. | Negligible |
| **Denial of Service** | Adversary creates millions of nested files or huge gigabyte files to crash the server. | Medium | **Resource Caps**: 64 KB streaming buffer reads, directory traversal limits, configurable max file size limit (50 MB default), and event debouncing. | Low |
| **Elevation of Privilege** | Path traversal attempt to monitor or expose restricted system files outside scope. | High | **Strict Path Normalization**: `Path.resolve()` checks, traversal sequence (`..`) rejection, and protected folder blacklists. | Negligible |

---

## 3. Assumptions & Out-of-Scope Risks

1. **Kernel / Hypervisor Compromise**: An attacker with root/kernel privileges can hook operating system system calls (e.g., `NtReadFile` or Linux VFS) and return spoofed content directly to user-space tools. FileWatch explicitly documents this limitation.
2. **Cold Boot & Offline Physical Access**: Physical tampering while the machine is powered off cannot be intercepted in real-time, but is detected immediately upon the next system startup through the Periodic Verification Scanner.

