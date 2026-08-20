# Data Classification & Retention

## Data Classes

### Class 1: Account Data
| Field | Classification | Retention | Encryption | Access |
|-------|---------------|-----------|------------|--------|
| Email | PII | Until account deletion or 30-day purge | Not encrypted (used for auth) | User + Admin |
| Password hash | Credential | Until account deletion | bcrypt (not reversible) | None (cannot be decrypted) |
| Name (first/last) | PII | Until account deletion | Not encrypted | User + Admin |
| Username | Public | Until account deletion | Not encrypted | User + Admin |
| Country | PII (low) | Until account deletion | Not encrypted | User + Admin |

### Class 2: Cognitive Data
| Field | Classification | Retention | Encryption | Access |
|-------|---------------|-----------|------------|--------|
| Memory content | Sensitive | Not deleted unless user requests | Not encrypted at rest | User only (tenant-isolated) |
| Memory embeddings | Derived | Same as memory content | Not encrypted at rest | User only |
| Category/theme | Metadata | Same as memory content | Not encrypted | User only |
| Commitment deadline | Scheduling | Until fulfilled + 30 days | Not encrypted | User only |
| Witness contact | PII | Until commitment fulfilled | Not encrypted | User + Witness |

### Class 3: Channel Credentials
| Field | Classification | Retention | Encryption | Access |
|-------|---------------|-----------|------------|--------|
| Bot tokens | Secret | Until channel disconnect | AES encrypted | User only (decrypted for delivery) |
| API keys | Secret | Until key deletion | AES encrypted | User only |

### Class 4: Analytics
| Field | Classification | Retention | Encryption | Access |
|-------|---------------|-----------|------------|--------|
| Event type | Non-PII | 90 days (auto-purge) | Not encrypted | Admin (anonymized) |
| Anonymized hash | Non-PII | 90 days (auto-purge) | Hashed (one-way) | Admin |
| Timestamp | Non-PII | 90 days (auto-purge) | Not encrypted | Admin |

### Class 5: Compliance Data
| Field | Classification | Retention | Encryption | Access |
|-------|---------------|-----------|------------|--------|
| Consent log | PII | 3 years (GDPR max) | Not encrypted | User + Admin |
| Grievance data | PII | 3 years (legal requirement) | Not encrypted | User + Admin + DPO |
| Breach log | Security | 3 years (legal requirement) | Not encrypted | Admin + DPO |

### Class 6: Agent Memory
| Field | Classification | Retention | Encryption | Access |
|-------|---------------|-----------|------------|--------|
| Agent findings | Derived | TTL-based (hours to days) | Not encrypted | User only |
| Agent prompts | Transient | Not persisted | N/A | N/A |

## Data Flow Audit

### Where PII exists:
- `users` table: email, name, country
- `channels` table: credentials (encrypted)
- `compliance_consent_log`: user_id + IP address
- `compliance_grievances`: user_id + description (may contain PII)
- `audit_log`: user_id + IP address (30-day auto-prune)

### Where PII should NOT exist:
- `analytics_events` — only anonymized hashes, no user IDs
- `memory_graph` — content field may contain PII (user-generated). No automated PII detection
- `agent_memories` — content is derived from memory_graph, may inherit PII

## Deletion Behavior

| Trigger | What happens | Timeline |
|---------|-------------|----------|
| User requests deletion | confirmation token → cascade delete memories, channels, notifications, billing | Immediate |
| User requests deletion | Email anonymized to `deleted_{uuid}@removed.local` | Immediate |
| Post-deletion cleanup | Hard delete from `users` table | 30 days after deletion request |
| Analytics purge | Delete events older than 90 days | Daily cron |
| Audit log purge | Delete entries older than 30 days | On startup + daily |
| Consent log purge | Delete entries older than 3 years | Daily cron |

## Access Control Matrix

| Role | Memory | Channels | Billing | Admin | Compliance |
|------|--------|----------|---------|-------|------------|
| User (own) | CRUD | CRUD | Read | None | Read + Submit grievance |
| User (other) | None | None | None | None | None |
| Admin | All (via admin routes) | All | All | All | All + Respond to grievances |
| System (cron) | None | None | Reset daily runs | None | Purge expired data |
| System (PulseKit) | None | Read (decrypt for delivery) | None | None | None |

## Encryption Standards

| At rest | In transit | In use |
|---------|-----------|--------|
| API keys: AES-256 (CryptoJS) | TLS 1.2+ (via Render/Host) | In-memory only |
| Passwords: bcrypt (12 rounds) | HTTPS | Never in plaintext after hashing |
| Channel credentials: AES-256 | HTTPS for API calls | Decrypted per-request for delivery |

## Recommended Improvements

1. **PII detection**: Scan memory_graph content for email addresses, phone numbers, and other PII patterns
2. **Data export format**: Implement machine-readable export (JSON) for GDPR Art. 20 portability
3. **Automated PII masking**: Option for users to auto-redact PII from memories
4. **Retention policy UI**: Let users configure per-category retention periods
