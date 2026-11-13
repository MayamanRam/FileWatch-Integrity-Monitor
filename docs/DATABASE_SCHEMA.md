# Database Schema Specification — FileWatch

## 1. Schema Overview

FileWatch utilizes SQLAlchemy 2.0 ORM with SQLite for local, single-operator deployment, maintaining ANSI-SQL compatibility for seamless migration to PostgreSQL in multi-tenant cloud environments.

```mermaid
erDiagram
    MONITORED_DIRECTORIES ||--o{ INTEGRITY_BASELINES : contains
    MONITORED_DIRECTORIES ||--o{ SECURITY_EVENTS : records
    INTEGRITY_BASELINES ||--|{ BASELINE_FILES : stores
    SECURITY_EVENTS ||--o| SECURITY_ALERTS : triggers
    AUDIT_LOGS {
        string id PK
        datetime timestamp
        string action
        string target_type
        string target_id
        string actor
        string result
        string hmac_signature
    }

    MONITORED_DIRECTORIES {
        string id PK
        string path UK
        string label
        boolean recursive
        json include_extensions
        json exclude_extensions
        json exclude_subdirectories
        int max_file_size_mb
        boolean is_active
        string status
        datetime last_scanned_at
        datetime created_at
        datetime updated_at
    }

    INTEGRITY_BASELINES {
        string id PK
        string directory_id FK
        string name
        string description
        int file_count
        int total_size_bytes
        string baseline_hash
        string hmac_signature
        boolean is_active
        string tamper_status
        datetime created_at
    }

    BASELINE_FILES {
        string id PK
        string baseline_id FK
        string directory_id
        string relative_path
        string file_name
        int file_size
        string sha256_hash
        string file_type
        string file_permissions
        datetime created_time
        datetime modified_time
        string record_hmac
    }

    SECURITY_EVENTS {
        string id PK
        datetime timestamp
        string directory_id FK
        string directory_path
        string relative_path
        string file_name
        string event_type
        string severity
        string previous_hash
        string current_hash
        json previous_metadata
        json current_metadata
        string details
        string verification_status
        string baseline_id
        string investigation_status
    }

    SECURITY_ALERTS {
        string id PK
        string event_id FK
        string title
        string description
        string severity
        string status
        string investigation_notes
        string directory_path
        string file_path
        datetime created_at
        datetime updated_at
        datetime acknowledged_at
        datetime resolved_at
    }
```

---

## 2. Table Definitions & Constraints

### 2.1 `monitored_directories`
- `id` (VARCHAR 36, PK): UUIDv4 identifier.
- `path` (VARCHAR 1024, Unique, Index): Normalized absolute directory path.
- `label` (VARCHAR 255): Human-friendly identifier.
- `recursive` (BOOLEAN): Traversal depth indicator.
- `include_extensions` / `exclude_extensions` / `exclude_subdirectories` (JSON): Filter arrays.
- `status` (VARCHAR 50): `'active' | 'paused' | 'error'`.

### 2.2 `integrity_baselines`
- `baseline_hash` (CHAR 64): SHA-256 root aggregate checksum across sorted file hashes.
- `hmac_signature` (CHAR 64): HMAC-SHA256 signature calculated over `id|dir_id|count|size|hash|timestamp`.
- `tamper_status` (VARCHAR 50): `'VALID' | 'TAMPERED' | 'UNVERIFIED'`.

### 2.3 `baseline_files`
- `sha256_hash` (CHAR 64, Index): SHA-256 checksum of the file content.
- `record_hmac` (CHAR 64): HMAC-SHA256 signature of the individual file metadata row for granular tamper pinpointing.

### 2.4 `security_events`
- `event_type` (VARCHAR 50): `'FILE_CREATED' | 'FILE_MODIFIED' | 'FILE_DELETED' | 'FILE_RENAMED' | 'METADATA_CHANGED' | 'INTEGRITY_VERIFIED' | 'BASELINE_TAMPERING_SUSPECTED'`.
- `severity` (VARCHAR 20): `'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL'`.

