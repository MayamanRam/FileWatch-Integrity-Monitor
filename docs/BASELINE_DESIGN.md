# Baseline Design & Tamper Detection Architecture — FileWatch

## 1. What Constitutes an Integrity Baseline?

An **Integrity Baseline** represents the verified, authorized snapshot of a monitored directory at a specific point in time. It serves as the single source of truth against which all future filesystem events and periodic scans are reconciled.

---

## 2. Cryptographic Tamper-Evidence

Traditional FIM systems store file hashes in a local database (e.g., SQLite or MySQL). If an adversary gains local access, they can simply modify the database table to replace the original hash with their malicious payload's hash.

To defeat this attack vector, FileWatch introduces **Dual-Layer HMAC Sealing**:

### Layer 1: Aggregate Baseline Seal
```
Canonical String:
  baseline_id | directory_id | file_count | total_size_bytes | root_hash | created_at_iso

hmac_signature = HMAC-SHA256(secret_key, Canonical String)
```

### Layer 2: Per-File Record HMAC Seal
```
Canonical String:
  baseline_id | relative_path | sha256_hash | file_size | modified_time_iso

record_hmac = HMAC-SHA256(secret_key, Canonical String)
```

---

## 3. Tamper Verification Algorithm

When `checkBaselineTamper(id)` or scheduled integrity audits execute:

1. **Root Verification**: Recalculate root HMAC and compare with `baseline.hmac_signature` using `hmac.compare_digest`.
2. **Record Verification**: Iterate through all `BaselineFile` records for the baseline:
   - Recompute each record's HMAC.
   - If any record's stored `record_hmac` fails verification, record that path as **tampered**.
3. **Aggregate Recalculation**: Recompute the aggregate root hash from the file list and verify match with `baseline.baseline_hash`.
4. **Action on Tampering**:
   - Set baseline status to `TAMPERED`.
   - Issue immediate **CRITICAL** Security Alert: `CRITICAL: Baseline Tampering Detected`.
   - Log an audit trail entry.

---

## 4. Key Management & Sealing

- The HMAC signing key is loaded from `.env` (`HMAC_SECRET_KEY`) or generated on initial startup and stored with restricted filesystem permissions in `data/.hmac_key`.
- Key separation ensures that write access to the database alone does not grant the capability to forge valid baseline signatures.

