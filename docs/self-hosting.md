# Self-hosting

## Recommended: start in log-only mode

New guilds default to **action mode 2** (log only). Before enabling delete or ban:

1. `/config log-channel #mod-log`
2. `/config test text:...` with sample URLs
3. Review logs in the channel
4. Review logs in the channel
5. `/config action mode:1` for delete + log
6. Enable mode `0` (ban), `3` (timeout), or `4` (ban + timeout) only when you trust high-confidence rules
7. Set high-confidence timeout length with `/config timeout-duration`

**Auto-ban / auto-timeout never triggers on fuzzy pHash alone.**

## Environment

Copy `env/.env.example` to `env/.env.production` for production runs.

| Variable | Notes |
|----------|-------|
| `SCAM_ACTION` | Default action mode for env reference (lazy-init still uses mode 2) |
| `PHASH_THRESHOLD` | Delete+log sensitivity (default 8) |
| `PHASH_STRICT_THRESHOLD` | High-confidence pHash sensitivity (default 3) |
| `TIMEOUT_DURATION_SECONDS` | Default high-confidence timeout length (default 3600) |

## Single instance only

Do not run multiple bot processes against one SQLite file. See [architecture.md](architecture.md).

## Docker (optional)

Build with `pnpm build` and run `node dist/infra/bootstrap/index.js` with `/data` volume mounted for SQLite and seed files.
