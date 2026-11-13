# Filesystem Security & Scope Validation — FileWatch

## 1. Scope Boundary Enforcement

FileWatch enforces strict boundaries around monitored directories. The integrity monitoring daemon never assumes full access to the host operating system.

### 1.1 Absolute Path Resolution & Traversal Checks
- Every input path is resolved to an absolute canonical path using `pathlib.Path.resolve()`.
- Inputs containing relative path traversals (e.g. `../` or `..\`) are rejected immediately before disk access.
- Non-normalized representations and null byte injections are blocked at the schema validation boundary.

### 1.2 Root Drive Protection
- Registering a root filesystem (e.g., `C:\`, `/`, or volume root) is explicitly rejected. Scanning an entire operating system root causes excessive disk I/O, captures ephemeral kernel caches, and exposes system runtime files.

### 1.3 Protected System Directory Blacklist
- The system prevents registering protected sibling directories (`CyberRAG-Standalone-v1.1.0` and `mayamanram-portfolio`) and critical system paths.

---

## 2. Symbolic Link & Hard Link Handling

- **Symlink Target Resolution**: When a symbolic link is encountered in recursive scanning, FileWatch resolves the link's target.
- **Escape Prevention**: If the symlink points outside the monitored directory tree, the symlink is skipped to prevent directory escape attacks.
- **Loop Defense**: Circular symlink references are intercepted to avoid infinite traversal loops.

---

## 3. Safe Hashing & File Locking

- **Streaming Read Chunks**: Files are read in fixed 64 KB chunks, preventing large memory buffers.
- **Time-of-Check / Time-of-Use (TOCTOU) Handling**: If a file is concurrently modified or truncated while being hashed, the engine detects the discrepancy via post-stat comparison and retries the read once to acquire a settled hash.
- **Permission Errors**: Inaccessible or locked files are safely logged with explicit permission error indicators without crashing the background worker.

