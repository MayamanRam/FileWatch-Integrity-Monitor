# FileWatch — Professional File Integrity Monitoring & Tamper Detection System

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Python](https://img.shields.io/badge/Python-3.11%2B-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688)
![React](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF)
![Bandit](https://img.shields.io/badge/Bandit-Passed%20(0%20issues)-success)
![Tests](https://img.shields.io/badge/Tests-31%2F31%20Passing-brightgreen)

> **"Monitor. Detect. Verify."**

**FileWatch** is an enterprise-grade File Integrity Monitoring (FIM) and tamper detection system developed for production cybersecurity environments. It continuously observes user-authorized directories, maintains cryptographically sealed state baselines, detects file modifications, drops, or deletions, surfaces security alerts, and exports formal compliance audit reports.

---

## Key Features

1. **Streaming SHA-256 Hashing Engine**
   - High-throughput chunked streaming reads (64 KB buffers) ensuring constant low memory usage.
   - Resilient against files changing during read, permission denials, and zero-byte files.
   - Categorizes files into Executables, Configurations, Text, Binary, and Unknown.

2. **Tamper-Evident Baseline Management**
   - Baselines capture root aggregate SHA-256 hashes sealed with HMAC-SHA256 signatures.
   - Individual baseline file entries maintain separate HMAC checksums.
   - Detects offline SQLite database tampering (e.g. an attacker modifying hashes to disguise a rootkit).

3. **Real-Time Filesystem Monitoring**
   - Python Watchdog event engine with intelligent event debouncing (1.0s window).
   - Duplicate event flood suppression.
   - Strict scope restrictions: never scans OS drive root or unauthorized folders.

4. **Periodic Integrity Verification Scanner**
   - Scheduled full directory reconciliation catches modifications made while monitoring was paused or missed by OS event queues.

5. **Security Incident & Alert Triage**
   - Automated event classification (CRITICAL, HIGH, MEDIUM, LOW, INFORMATIONAL).
   - Alert lifecycle: Open → Acknowledged → Resolved with analyst investigation notes.

6. **Tamper-Evident Audit Logging**
   - Operational audit records sealed with HMAC signatures.

7. **Multi-Format Reporting**
   - **PDF**: Executive formatted report with summary metrics, tables, and NIST disclaimers.
   - **CSV**: Tabular SIEM and spreadsheet ready.
   - **JSON**: Complete raw data payload for automation pipelines.

8. **Cybersecurity-Themed UI/UX**
   - Dark theme (`#070B14`, `#0D1527`), cyan and purple accents, Lucide icons, and Recharts metrics.

---

## Architecture Overview

```
+----------------------------------------------------------------+
|                   FileWatch Frontend (React + Vite)            |
|       Dashboard | Monitored Dirs | Baselines | Events | Alerts |
+-------------------------------+--------------------------------+
                                | HTTP REST API (/api/v1)
+-------------------------------v--------------------------------+
|                   FastAPI Backend Core                         |
|  +---------------------+   +--------------------------------+  |
|  | Path Validator      |   | Cryptographic Hasher (SHA-256) |  |
|  +---------------------+   +--------------------------------+  |
|  +---------------------+   +--------------------------------+  |
|  | Baseline Engine     |   | Tamper Detector (HMAC-SHA256)  |  |
|  +---------------------+   +--------------------------------+  |
|  +---------------------+   +--------------------------------+  |
|  | Watchdog Observer   |   | Periodic Reconciliation Scanner|  |
|  +---------------------+   +--------------------------------+  |
|  +---------------------+   +--------------------------------+  |
|  | Alert Manager       |   | ReportLab PDF & CSV Exporters  |  |
|  +---------------------+   +--------------------------------+  |
+-------------------------------+--------------------------------+
                                |
                   +------------v------------+
                   |  SQLite / PostgreSQL DB |
                   |  (Signed FIM Records)   |
                   +-------------------------+
```

---

## Quickstart & Installation

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Clone & Set Up Backend
```bash
cd 03-FileWatch-Integrity-Monitor/backend
python -m pip install -r requirements.txt
```

### 2. Run Backend Tests & Security Scans
```bash
# Execute automated pytest test suite (31 tests)
pytest -v

# Run Bandit AST Security Scan
python -m bandit -r app
```

### 3. Seed Demo Data (Optional)
```bash
cd ..
python scripts/seed_demo_data.py
```

### 4. Start Backend Server
```bash
python scripts/run_backend.py
# Backend runs at http://localhost:8000 (Swagger docs at http://localhost:8000/docs)
```

### 5. Start Frontend Dashboard
```bash
cd frontend
npm install
npm run build   # Production bundle
npm run dev     # Development live server at http://localhost:5173
```

---

## Security & Quality Verification

| Check | Tool | Result |
| :--- | :--- | :--- |
| **Unit & Integration Tests** | `pytest` | **31 Passed, 0 Failed** |
| **Static Code Analysis** | `bandit` | **0 High, 0 Medium, 0 Low issues** |
| **Path Traversal Defense** | Unit tests | **Enforced & Verified** |
| **Tamper Detection Engine** | Unit tests | **Enforced & Verified** |
| **Frontend Production Build** | `vite build` | **Successfully compiled** |

---

## Known Limitations

1. **Host Privilege Boundary**: As a user-space daemon, FileWatch cannot prevent malicious modification if an adversary gains root/administrator privileges and compromises kernel or filesystem drivers.
2. **Offline Filesystem Changes**: Changes made to physical disks while the host machine is turned off will be detected upon next boot via the Periodic Verification Scanner, but cannot trigger real-time events during power-off.

---

## License

This project is licensed under the MIT License.

