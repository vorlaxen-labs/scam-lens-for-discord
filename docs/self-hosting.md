# Self-hosting

## Recommended: start in log-only mode

New guilds default to **action mode 2** (log only). Before enabling delete or ban:

1. `/config log-channel #mod-log`
2. `/config test text:...` with sample URLs
3. Review logs in the channel
4. `/config action mode:1` for delete + log
5. Enable mode `0` (ban) only when you trust high-confidence rules
6. Optional: `/config timeout enabled:true duration:3600` for member timeout on detections

**Auto-ban never triggers on fuzzy pHash alone.**

## Environment

Copy `env/.env.example` to `env/.env.production` for production runs.

| Variable | Notes |
|----------|-------|
| `BOT_TOKEN` | Required — Discord bot token |
| `BOT_CLIENT_ID` | Required — application ID |
| `DATABASE_PATH` | Default `./data/scam-lens.db`; use `/app/data/scam-lens.db` in Docker |
| `SCAM_ACTION` | Default action mode for env reference (lazy-init still uses mode 2) |
| `PHASH_THRESHOLD` | Delete+log sensitivity (default 8) |
| `PHASH_STRICT_THRESHOLD` | High-confidence pHash sensitivity (default 3) |
| `TIMEOUT_DURATION_SECONDS` | Default timeout length for new guild records (default 3600) |

## Single instance only

Do not run multiple bot processes against one SQLite file. See [architecture.md](architecture.md).

Coolify replica count must stay at **1**.

---

## Docker

### Local development

```bash
docker compose -f docker-compose.dev.yml up --build
```

- Source bind mount with hot reload (`tsx watch`)
- SQLite at `./data/scam-lens.db` (bind-mounted)
- Env from `env/.env.development`

### Local production smoke test

```bash
docker compose -f docker-compose.prod.yml up --build -d
docker compose -f docker-compose.prod.yml logs -f bot
```

---

## Coolify production deployment

### 1. Create the application

Two supported paths — pick one:

**Option A — Docker Compose (recommended, matches repo layout)**

1. **New Resource** → **Docker Compose**
2. Git repo + branch
3. Compose file: `docker-compose.prod.yml`

**Option B — Dockerfile only**

1. **New Resource** → **Application**
2. Build pack: **Dockerfile**
3. Dockerfile location: `Dockerfile.prod`

### 2. Persistent storage (required)

Without this, every redeploy wipes guild settings, logs, and allowlists.

Seed assets (`domains.txt`, reference scam images) live in the Docker image at `/app/seed/` and are **not** stored in the volume. Only the SQLite database and lock file belong in `/app/data`.

Coolify → your resource → **Persistent Storage** → **Add**:

| Field | Value |
|-------|-------|
| **Name** | `scam-lens-data` |
| **Mount path (container)** | `/app/data` |
| **Type** | Volume |

Set environment variable:

```
DATABASE_PATH=/app/data/scam-lens.db
```

Verify after first deploy (Terminal → container):

```bash
ls -la /app/data
# scam-lens.db should appear after bot starts
```

Redeploy once and confirm the file persists with the same size.

### 3. Environment variables

Set in Coolify → **Environment Variables** (mark secrets as encrypted):

| Variable | Required | Value |
|----------|----------|-------|
| `BOT_TOKEN` | yes | Discord bot token |
| `BOT_CLIENT_ID` | yes | Application ID |
| `NODE_ENV` | yes | `production` |
| `DATABASE_PATH` | yes | `/app/data/scam-lens.db` |
| `LOG_CHANNEL_ID` | no | Central log hub channel |
| `TELEMETRY_ENABLED` | no | Structured telemetry to pino + central channel (default `true`) |
| `TELEMETRY_GUILD_EVENTS` | no | Post join/leave/ready events to central channel (default `true`) |
| `TELEMETRY_COMMANDS` | no | Post command use/deny/error to central channel (default `false`) |
| `BOT_GUILD_ID` | no | **Dev only** — instant guild slash sync. Leave **empty in production** or commands appear in one server only |
| `OWNER_IDS` | no | Comma-separated Discord user IDs |
| `GITHUB_REPO_URL` | no | `/about` button link |
| `PRESENCE_ENABLED` | no | `true` (default) |
| `INSTALL_SYNC_ENABLED` | no | `true` (default) |

Do not commit `env/.env.production` with real tokens.

### 4. Deploy settings

| Setting | Value |
|---------|-------|
| **Replicas** | `1` |
| **Public port** | None — Discord bot uses outbound gateway only |
| **Health check** | Skip — no HTTP endpoint |

### 5. First deploy checklist

- [ ] Persistent storage mounted at `/app/data`
- [ ] `DATABASE_PATH=/app/data/scam-lens.db` set
- [ ] `BOT_TOKEN` and `BOT_CLIENT_ID` set
- [ ] Deploy → logs show `SQLite database initialized`, `imageCount: 4`, and `referenceImageHashes: 4` in startup
- [ ] Bot appears online in Discord
- [ ] Redeploy → guild data still present

---

## Coolify native backup (volume)

Coolify can schedule automatic backups of the `/app/data` volume to local disk and/or S3-compatible storage. No custom backup script needed.

### Step 1 — Configure S3 storage (recommended for off-site)

Coolify sidebar → **S3 Storages** → **Add**

Works with AWS S3, Cloudflare R2, Backblaze B2, MinIO, Supabase Storage, etc.

| Field | Example |
|-------|---------|
| **Endpoint** | `https://s3.eu-central-1.amazonaws.com` (no bucket name) |
| **Bucket** | `my-coolify-backups` |
| **Region** | `eu-central-1` |
| **Access key / Secret** | IAM credentials scoped to bucket |

Click **Validate Connection & Continue**.

For local-only backups you can skip S3 and use on-server retention instead.

### Step 2 — Enable backup on the volume

Coolify → your bot resource → **Persistent Storage** → select the `/app/data` mount → **Backup** section:

| Field | Recommended |
|-------|-------------|
| **Frequency** | `0 3 * * *` (daily at 03:00) or `daily` |
| **Local retention** | `7` copies |
| **S3 storage** | Select your S3 destination (if configured) |
| **S3 retention** | `14` copies |
| **Timeout** | `300` seconds |

Save and click **Run backup now** to test the first execution.

Coolify briefly stops the bot container during volume backup, then restarts it. Expect ~30–60 seconds of downtime during backup windows.

### Step 3 — Backup notifications

Coolify → **Notifications** → enable backup success/failure events for your channel (Discord, Telegram, email, etc.).

### Step 4 — Restore from backup

1. Coolify → Persistent Storage → your volume → **Backup** → execution history
2. Download or restore the backup archive
3. Stop the bot
4. Replace `/app/data` contents with the restored files (`scam-lens.db` at minimum)
5. Start the bot

For disaster recovery on a new server: deploy fresh, mount empty volume, restore backup into `/app/data`, redeploy.

---

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Settings reset after redeploy | Volume not mounted at `/app/data` |
| `database is locked` | Multiple replicas or stale container |
| Bot offline | Invalid `BOT_TOKEN` or missing intents |
| Domain seed count is 0 | Image build missing `data/text/domains.txt` |
| `imageCount: 0` on boot | Image build missing `data/images/` — pHash detection disabled |
| Image posted but no reaction | No matching pHash in DB (seed empty or image not in reference set) |
| Backup fails | Container not running, or timeout too low for large DB |
