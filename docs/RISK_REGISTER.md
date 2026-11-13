# Risk Register — FileWatch

## 1. Risk Evaluation Matrix

Risks are assessed according to Impact (1–5) and Likelihood (1–5), generating a Risk Score ($\text{Impact} \times \text{Likelihood}$).

| Risk ID | Threat / Event Description | Likelihood | Impact | Score | Mitigation Strategy | Owner |
| :---: | :--- | :---: | :---: | :---: | :--- | :---: |
| **RSK-01** | **Root / Kernel Compromise**: An adversary with root/admin access hooks syscalls to forge file reads. | 2 | 5 | **10 (Med)** | Document explicit threat boundary; recommend host OS hardening and secure boot. | Security Arch |
| **RSK-02** | **Disk / DB Corruption**: SQLite database file gets corrupted during unexpected power loss. | 2 | 4 | **8 (Med)** | SQLAlchemy WAL mode recommended; automated scheduled database file backups. | DevOps |
| **RSK-03** | **HMAC Key Loss**: The secret key file `data/.hmac_key` is deleted or lost. | 1 | 4 | **4 (Low)** | Key backup documented in deployment guide; alert raised if key mismatch occurs. | SecOps |
| **RSK-04** | **Event Notification Loss**: High-velocity bulk file changes exhaust operating system event buffer. | 3 | 2 | **6 (Low)** | Periodic full reconciliation scan runs every 300 seconds to catch unmissed changes. | Dev Team |
| **RSK-05** | **Memory Exhaustion**: Extremely large multi-gigabyte file added to monitored directory. | 2 | 3 | **6 (Low)** | Enforce configurable 50 MB - 100 MB max file size limit and 64 KB chunked streaming. | Dev Team |
| **RSK-06** | **Symlink Traversal Escape**: Adversary creates symlink pointing to sensitive system folder outside tree. | 2 | 3 | **6 (Low)** | `is_safe_symlink` validates resolved target against directory tree boundary; skips unsafe links. | AppSec |
| **RSK-07** | **False Positive Alert Storms**: Rapid saves during development overwhelm SOC analysts. | 3 | 2 | **6 (Low)** | Watchdog debouncing queue (1.0s settle window) and duplicate suppression filters. | Dev Team |

