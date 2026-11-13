# REST API Specification — FileWatch v1.0

## 1. Overview & Base URL

- **Base URL**: `/api/v1`
- **Protocol**: HTTP/1.1 and HTTP/2
- **Data Exchange**: JSON (`application/json`) with standard HTTP status codes.

---

## 2. API Endpoints

### 2.1 System & Telemetry

#### `GET /api/v1/system/status`
Returns high-level system monitoring health, total files, active baseline counts, and tamper detection flags.
```json
{
  "system_status": "OPERATIONAL",
  "is_monitoring_active": true,
  "monitored_directories_count": 2,
  "active_baselines_count": 2,
  "total_monitored_files": 48,
  "open_alerts_count": 1,
  "critical_alerts_count": 0,
  "events_last_24h": 5,
  "last_verification_time": "2026-11-13T09:15:00Z",
  "baseline_tamper_detected": false
}
```

#### `GET /api/v1/system/health`
Returns quick health heartbeat: `{"status": "healthy", "service": "FileWatch Integrity Monitor"}`.

---

### 2.2 Monitored Directories

#### `GET /api/v1/directories`
Lists all registered directories, active baseline IDs, and status.

#### `POST /api/v1/directories`
Registers a new authorized directory, establishes initial baseline, and begins monitoring.
- **Request Body**:
  ```json
  {
    "path": "D:\\Projects\\FileWatch\\demo_web_root",
    "label": "Production Web Assets",
    "recursive": true,
    "include_extensions": [],
    "exclude_extensions": [".tmp", ".bak"],
    "exclude_subdirectories": [".git", "node_modules"],
    "max_file_size_mb": 50
  }
  ```
- **Responses**: `201 Created`, `400 Bad Request` (traversal or nonexistent), `409 Conflict` (duplicate).

#### `DELETE /api/v1/directories/{id}`
Removes a directory from monitoring scope (`204 No Content`).

#### `POST /api/v1/directories/{id}/scan`
Triggers an immediate on-demand full integrity verification scan against active baseline. Returns discrepancy list.

#### `POST /api/v1/directories/{id}/pause` & `POST /api/v1/directories/{id}/resume`
Toggles real-time watchdog filesystem observation on the target directory.

---

### 2.3 Integrity Baselines

#### `GET /api/v1/baselines?directory_id={id}`
Lists baseline records for the specified directory or all directories.

#### `POST /api/v1/baselines`
Creates a newly sealed baseline snapshot after an authorized maintenance window.

#### `GET /api/v1/baselines/{id}`
Returns baseline details and the full array of tracked files with individual hashes and types.

#### `GET /api/v1/baselines/{id}/tamper-check`
Runs cryptographic validation across the root HMAC signature and all individual file records.
- **Response**:
  ```json
  {
    "baseline_id": "7eb9d59e-6295-4bfb-86fc-2d58c04692f2",
    "name": "Baseline v1.0",
    "is_tampered": false,
    "status": "VALID",
    "root_hmac_valid": true,
    "tampered_file_records": [],
    "message": "Baseline integrity confirmed intact."
  }
  ```

---

### 2.4 Security Events & Alerts

#### `GET /api/v1/events`
Query parameters: `directory_id`, `event_type`, `severity`, `limit` (default 100), `offset` (default 0).

#### `GET /api/v1/alerts`
Query parameters: `status` (`open`, `acknowledged`, `resolved`), `severity` (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`).

#### `PATCH /api/v1/alerts/{id}`
Updates alert status and appends investigation notes.
- **Request Body**:
  ```json
  {
    "status": "acknowledged",
    "investigation_notes": "Identified as approved developer hotfix."
  }
  ```

---

### 2.5 Reports & Export

#### `POST /api/v1/reports/export`
- **Request Body**: `{"format": "pdf" | "csv" | "json", "directory_id": "...", "severity": "..."}`
- **Responses**:
  * For `pdf`: `application/pdf` binary stream.
  * For `csv`: `text/csv` stream.
  * For `json`: JSON payload with complete metadata.

