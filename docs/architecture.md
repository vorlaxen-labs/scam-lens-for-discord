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
      ├── In-memory L1 domain Set (~21k entries, O(labels) suffix lookup)
      └── SQLite (source of truth)
```

## Scale-out note

Running **multiple bot instances** against one SQLite file is unsupported — each instance would diverge. Future scale-out requires **PostgreSQL** as shared storage.

**Redis** is on the roadmap for multi-instance cooldown/cache coordination; it is **not implemented** in the current codebase.

## Detection flow

1. Deduplicate by `messageId` (SQLite claim)
2. Scan message text/embeds/components for blocked domains (suffix match via Set lookup per hostname label)
3. Scan up to 3 image attachments via pHash (stream-limited fetch, first animated frame only)
4. Compute trust score and moderation tier:
   - **High confidence** (guild domain, strict pHash, dual) → ban or timeout per action mode
   - **Fuzzy pHash only** → optional quarantine timeout when enabled
   - **Global domain only** → delete + log, no auto-ban
5. Log with ULID operation ID (`SL-...`) to guild and/or central hub channel

## False-positive mitigation

- Per-guild **allowlist** (`/add-allow-domain`)
- **Restore** flow (`/config restore`) with optional operation ID audit
- Global blocklist sourced from third-party seed — see [data/text/SOURCES.md](../data/text/SOURCES.md)
