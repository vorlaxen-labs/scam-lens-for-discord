# Setup (5 minutes)

## 1. Create Discord application

1. Open [Discord Developer Portal](https://discord.com/developers/applications)
2. **New Application** → copy **Application ID** → `BOT_CLIENT_ID`
3. **Bot** → **Reset Token** → `BOT_TOKEN`
4. Enable **Privileged Gateway Intents**:
   - **Message Content Intent** (required — bot reads message text for URLs)
   - Server Members Intent (recommended for ban/timeout)
5. **OAuth2 → URL Generator**
   - Scopes: `bot`, `applications.commands`
   - Bot permissions: `Manage Messages`, `Ban Members`, `Moderate Members`, `Send Messages`, `Embed Links`
6. **Installation**
   - Under **Install Link**, choose **Discord Provided Link** or **Custom URL** (not **None**)
   - The bot syncs the invite URL on startup (`INSTALL_SYNC_ENABLED=true` by default) so the profile **Add App** button works

## 2. Configure environment

```bash
cp env/.env.example env/.env.development
```

| Variable | Required | Notes |
|----------|----------|-------|
| `BOT_TOKEN` | yes | Bot token |
| `BOT_CLIENT_ID` | yes | Application ID |
| `BOT_GUILD_ID` | dev only | Faster slash command sync |
| `DATABASE_PATH` | no | Default `./data/scam-lens.db` |

## 3. Install and run

```bash
pnpm install
pnpm dev
```

On first start the bot seeds `domains.txt` and `data/images/` into SQLite.

## 4. Configure your server

1. Invite the bot using the OAuth URL
2. `/config log-channel #mod-log`
3. Start in log-only: default for new guilds (mode 2)
4. Test: `/config test text:https://example-scam-domain.test`
5. When ready: `/config action mode:1` (delete + log)
6. Optional timeout on all detections: `/config timeout enabled:true duration:3600`

### Action modes

| Mode | On detection | High confidence |
|------|--------------|-----------------|
| `0` | Delete + log | Ban |
| `1` | Delete + log | — |
| `2` | Log only | — |

Timeout is **not** tied to action mode. Enable it separately with `/config timeout`. It runs on every detection except when a ban is issued.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Slash commands missing | Wait ~1 min; set `BOT_GUILD_ID` for instant guild sync |
| Bot ignores messages | Enable **Message Content Intent** in Developer Portal |
| No detections | Check `/config status` — ensure `enabled: yes` |

## Multi-instance warning

Do **not** run multiple bot processes sharing one SQLite file. Scale-out requires PostgreSQL (future migration path — see `docs/architecture.md`).
