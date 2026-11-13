# Deployment & Operations Guide — FileWatch

## 1. Production Deployment Architecture

FileWatch can be deployed in two standard production topologies:
1. **Single-Node Local Host Security**: Local workstation or single server deployment monitoring local filesystems.
2. **Containerized / Multi-Node Agent**: Deployed via Docker with target host directories mounted read-only or with shared bind-mounts.

---

## 2. Windows Deployment Instructions

### Prerequisites
- Python 3.11 or later
- Node.js 18+ (LTS) & npm
- Git

### Backend Setup
```powershell
cd 03-FileWatch-Integrity-Monitor\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### Configure Environment
Create `.env` from template:
```powershell
Copy-Item ..\.env.example .env
```
Ensure `HMAC_SECRET_KEY` is set to a secure 64-character hex string (or leave blank to auto-generate a sealed key in `data/.hmac_key`).

### Running Backend Service
```powershell
python ..\scripts\run_backend.py
# Backend runs on http://localhost:8000
```

### Frontend Build & Hosting
```powershell
cd ..\frontend
npm install
npm run build
```
The compiled SPA is located in `frontend/dist`. You can serve it with Nginx, Caddy, or test locally with `npm run preview`.

---

## 3. Linux (Ubuntu / RHEL) Systemd Service Setup

To run FileWatch backend continuously as a systemd background daemon on Linux:

```ini
[Unit]
Description=FileWatch File Integrity Monitor Daemon
After=network.target

[Service]
Type=simple
User=filewatch
WorkingDirectory=/opt/filewatch/backend
ExecStart=/opt/filewatch/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=always
RestartSec=5
EnvironmentFile=/opt/filewatch/backend/.env

[Install]
WantedBy=multi-user.target
```
Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now filewatch
```

---

## 4. Operational Maintenance & Backups

1. **Database Backup**: The SQLite database is located at `data/filewatch.db`. Backup this file regularly.
2. **Key Backup**: Safeguard `data/.hmac_key` or `HMAC_SECRET_KEY`. If this key is lost, existing baseline HMAC signatures cannot be verified and must be re-baselined.

