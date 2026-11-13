# FileWatch Changelog

All notable changes to the FileWatch system are documented in this file.

## [1.0.0] - 2026-11-13
### Added
- **Cryptographic File Hashing Engine**: Chunked streaming SHA-256 calculation with memory bounds and runtime modification recovery.
- **Tamper-Evident Baseline Management**: Root and per-file HMAC-SHA256 signatures, aggregate checksum generation, and real-time database manipulation detection.
- **Filesystem Watchdog Monitoring**: Asynchronous event listener with debouncing (1.0s window), duplicate suppression, and path filtering.
- **Periodic Full Integrity Verification Scanner**: Automated background baseline reconciliation ensuring unmissed changes are detected.
- **Change Detection & Severity Classification Engine**: Automatic event classification into CRITICAL, HIGH, MEDIUM, LOW, and INFORMATIONAL based on file types and behavior.
- **Security Incident & Alert Management**: Prioritized alert queue with status workflow (open -> acknowledged -> resolved) and forensic notes.
- **Immutable Audit Logging**: Tamper-evident operational audit trail sealed with HMAC-SHA256 signatures.
- **Multi-Format Report Generation**: Executive PDF reports via ReportLab, SIEM-compatible CSV exports, and machine-readable JSON exports.
- **Modern Cybersecurity Frontend Dashboard**: Dark cybersecurity theme built with React 18, Vite, TypeScript, Tailwind CSS, Lucide icons, and Recharts.
- **Security & Quality Assurance**: 31 automated test cases, zero-issue Bandit AST security scan, path traversal defenses, and symlink escape prevention.

