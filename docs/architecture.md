# Architecture

## Runtime model

Single Node.js process serves multiple Discord guilds from one SQLite database file.

```
Discord Gateway
      │
      ▼
 messageCreate / interactionCreate
      │
      ▼
 Services (detection, blocklist, phash, logging)
      │
      ├── In-memory L1 domain Set (~21k entries)
      └── SQLite (source of truth)
```

## Scale-out note

Running **multiple bot instances** against one SQLite file is unsupported — each instance would diverge. Future scale-out requires **PostgreSQL** as shared storage.

Redis (`REDIS_ENABLED=true`) is optional and reserved for multi-instance cooldown/cache; default deployment does not use it.

## Detection flow

1. Deduplicate by `messageId` (60s TTL)
2. Scan message text/embeds/components for blocked domains (suffix match)
3. Scan up to 3 image attachments via pHash
4. Apply action mode; auto-ban/timeout only when `shouldAutoBan()` returns true
5. Log with ULID operation ID (`SL-...`) before/after delete
