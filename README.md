# Scam Lens For Discord

Scam image and domain protection for Discord servers. Open source.

[![CI](https://github.com/vorlaxen/scam-lens-discord-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/vorlaxen/scam-lens-discord-bot/actions/workflows/ci.yml)

## Quick start (~5 minutes)

```bash
git clone https://github.com/vorlaxen/scam-lens-discord-bot
cd scam-lens-discord-bot
cp env/.env.example env/.env.development
# Edit BOT_TOKEN and BOT_CLIENT_ID
pnpm install
pnpm dev
```

See [docs/setup.md](docs/setup.md) for Discord Developer Portal steps (Message Content intent required).

## Stack

| Component | Role |
|-----------|------|
| **SQLite** | Source of truth — domains, hashes, settings, logs |
| **In-memory L1** | Hot-path blocklist (~21k domains, suffix lookup) |
| **Node + discord.js v14** | Bot runtime |

Single process, multiple guilds. Running multiple bot instances against one SQLite file is **not supported**.

## Safe defaults

- New servers start in **log-only mode (2)** until you configure actions
- Production default action: **delete + log (1)**
- **Timeout** is independent of action mode — enable per server with `/config timeout`
- Auto-ban only on: **guild-added domain**, **strict pHash**, or **dual signal**
- Global seed domain alone: delete + log (no auto-ban) — reduces false positives from third-party lists
- Use `/add-allow-domain` to exempt trusted domains; `/config restore` to undo false positives

### Action modes (`/config action`)

| Mode | On detection | High confidence |
|------|--------------|-----------------|
| `0` | Delete + log | Ban |
| `1` | Delete + log | — *(recommended default)* |
| `2` | Log only | — *(new servers)* |

### Timeout (`/config timeout`)

When enabled, applies on **every** scam detection in any action mode — except when a ban is issued.

```
/config timeout enabled:true duration:3600
```

Blocklist provenance: [data/text/SOURCES.md](data/text/SOURCES.md)

## Commands

`/about` · `/get-hash` · `/add-scam` · `/remove-scam` · `/add-domain` · `/remove-domain` · `/list-domains` · `/add-allow-domain` · `/remove-allow-domain` · `/list-allow-domains` · `/config`

## Roadmap

- **Redis** — reserved for future multi-instance cooldown/cache (not implemented; single SQLite process today)
- **PostgreSQL** — shared storage for horizontal scale-out

## Maintenance

Blocklist sync and dependency updates are actively maintained; see [CHANGELOG.md](CHANGELOG.md) and Releases.

## License

MIT — see [LICENSE](LICENSE). Branding credit appreciated but not required: [BRANDING.md](BRANDING.md).

Created by [Vorlaxen](https://vorlaxen.com)
