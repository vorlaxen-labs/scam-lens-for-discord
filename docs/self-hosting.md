# Self-hosting

## Recommended: start in log-only mode

New guilds default to **action mode 2** (log only). Before enabling delete or ban:

1. `/config log-channel #mod-log`
2. `/config test text:...` with sample URLs
3. Review logs in the channel
4. `/config action mode:1` for delete + log
5. Enable mode 0 (ban) or 3 (timeout) only when you trust high-confidence rules

**Auto-ban never triggers on fuzzy pHash alone.**

## Environment

Copy `env/.env.example` to `env/.env.production` for production runs.

| Variable | Notes |
|----------|-------|
| `SCAM_ACTION` | Default for newly created guild records (lazy-init still uses mode 2) |
| `PHASH_THRESHOLD` | Delete+log sensitivity (default 8) |
| `PHASH_STRICT_THRESHOLD` | Auto-ban pHash sensitivity (default 3) |

## Single instance only

Do not run multiple bot processes against one SQLite file. See [architecture.md](architecture.md).

## Docker (optional)

Build with `pnpm build` and run `node dist/infra/bootstrap/index.js` with `/data` volume mounted for SQLite and seed files.
