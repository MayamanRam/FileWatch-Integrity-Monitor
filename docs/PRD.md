# Product Requirements Document (PRD) — FileWatch

## 1. Executive Summary

**FileWatch** is a professional File Integrity Monitoring (FIM) and Tamper Detection system designed for enterprise security operations, security engineers, compliance auditors, and system administrators. It establishes cryptographically signed baselines of authorized directories, observes filesystem events in real-time, reconciles disk states against baselines, detects potential database baseline tampering, and generates formal compliance reports.

**Product Tagline**: *"Monitor. Detect. Verify."*

---

## 2. Target Personas & Use Cases

1. **Cybersecurity Analyst / SOC Tier 1/2**:
   - Needs immediate notification when sensitive system files, web shells, or binaries are modified.
   - Requires cryptographic proof of file changes (before and after SHA-256 hashes).
2. **Application Security Engineer**:
   - Needs to protect web roots and application binaries against unauthorized script drops, malicious configuration tweaks, and unauthorized overwrites.
3. **Compliance & Audit Specialist**:
   - Requires immutable audit logs and exportable PDF/CSV integrity reports to satisfy PCI-DSS Requirement 11.5, NIST SP 800-53 (SI-7), and SOC 2 CC6.8.

---

## 3. Product Scope & Functional Requirements

### 3.1 Scope Management & Path Security
- Users must explicitly register directories for monitoring.
- The system must normalize paths, prevent path traversal attacks (`..`), and reject attempts to scan drive roots (`C:\`, `/`) or protected directories.
- Support recursive scanning, custom file extension inclusion/exclusion filters, and subdirectory exclusion rules (`node_modules`, `.git`, `__pycache__`).

### 3.2 Cryptographic File Hashing Engine
- Compute SHA-256 hashes using streaming chunked reads (64 KB buffers) to ensure zero memory exhaustion.
- Collect metadata: relative path, file size, creation timestamp, modification timestamp, permissions, and classified file type.
- Handle files modified during reads, permission errors, zero-byte files, and non-existent files.

### 3.3 Tamper-Evident Baseline Management
- Capture authorized directory snapshots into signed baselines.
- Calculate root aggregate checksum across all baseline files.
- Sign the baseline metadata and individual file records with HMAC-SHA256 using an isolated secret key.
- Provide on-demand cryptographic tamper verification to alert on unauthorized SQLite record alterations.

### 3.4 Continuous Filesystem Event Monitoring
- Monitor OS filesystem events (Created, Modified, Deleted, Renamed/Moved) using Python Watchdog.
- Implement debouncing (1.0s window) and duplicate suppression to avoid OS event floods.

### 3.5 Periodic Full Verification Scanning
- Background reconciliation engine periodically walks the directory to catch changes missed while the system was offline or paused.

### 3.6 Security Incident & Alert Triage
- Automated severity classification:
  * **CRITICAL**: Executable modification/drop, baseline tampering.
  * **HIGH**: Sensitive configuration modification/drop, important file deletion.
  * **MEDIUM**: Standard content modification.
  * **LOW / INFORMATIONAL**: Metadata-only touch, clean verification.
- Interactive alert lifecycle: Open → Acknowledged → Resolved with analyst investigation notes.

### 3.7 Immutable Audit Logging & Reporting
- Audit log every administrative and security action with HMAC-SHA256 seals.
- Export reports in Executive PDF, SIEM CSV, and automation JSON formats.

---

## 4. Success Metrics

- **Zero False-Positive Event Storms**: Debouncing coalesces rapid write bursts into single actionable events.
- **100% Cryptographic Tamper Detection**: Any database tampering with baseline hashes triggers a Critical security alert.
- **Zero Memory Strain**: Streaming hashing handles files up to 100 MB with constant < 50 MB RAM footprint.

