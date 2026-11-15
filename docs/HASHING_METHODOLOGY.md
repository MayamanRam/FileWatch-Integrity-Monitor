# Hashing Methodology & Verification Engine — FileWatch

## 1. Cryptographic Hash Selection

FileWatch uses **SHA-256** (FIPS 180-4) as its primary cryptographic hash algorithm:
- 256-bit output size providing $2^{128}$ collision resistance.
- Zero known practical preimage or collision vulnerabilities.
- Native acceleration support via hardware instructions (SHA extensions on modern x86/ARM processors).

---

## 2. Streaming Read Architecture

Files are never loaded into RAM in their entirety. Instead, the streaming engine reads buffered chunks:

```python
sha256_ctx = hashlib.sha256()
with open(resolved_path, "rb") as f:
    while True:
        chunk = f.read(chunk_size)  # 64 KB
        if not chunk:
            break
        sha256_ctx.update(chunk)
return sha256_ctx.hexdigest()
```

### Memory Footprint Guarantee
Even when monitoring multi-gigabyte virtual disk images or software distributions, RAM usage remains constrained to the buffer chunk size ($64 \text{ KB}$ per hashing worker).

---

## 3. Metadata Collection Alongside Hashes

For every monitored file, the following forensic attributes are gathered:
1. `relative_path`: Path normalized relative to the monitored directory root.
2. `file_name`: Basename of the file.
3. `file_size`: Size in bytes.
4. `sha256_hash`: 64-character lowercase hexadecimal hash string.
5. `created_time`: File creation timestamp (where supported by OS).
6. `modified_time`: Content modification timestamp (`mtime`).
7. `file_permissions`: Octal permission mode representation.
8. `file_type`: Category classification (`executable`, `config`, `text`, `binary`, `unknown`).

---

## 4. Aggregate Root Hash Computation

To enable instantaneous directory-level verification, FileWatch computes an aggregate root hash for every baseline:
1. All baseline file paths are sorted lexicographically.
2. For each file, a canonical entry `"{relative_path}:{sha256_hash}"` is generated.
3. The lines are joined by `\n` and hashed with SHA-256 to produce the `baseline_hash`.
4. If a single file in the baseline is altered, added, or removed, the aggregate root hash changes completely.

