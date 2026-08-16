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
pnpm approve-builds better-sqlite3 sharp
pnpm dev
```

See [docs/setup.md](docs/setup.md) for Discord Developer Portal steps (Message Content intent required).

## Stack

| Component | Role |
|-----------|------|
| **SQLite** | Source of truth — domains, hashes, settings, logs |
| **In-memory L1** | Hot-path blocklist (~21k domains) |
| **Redis (optional)** | Multi-instance prep — default **off** |
| **Node + discord.js v14** | Bot runtime |

Single process, multiple guilds. Running multiple bot instances against one SQLite file is **not supported**.

## Safe defaults

- New servers start in **log-only mode (2)** until you configure actions
- Production default action: **delete + log (1)**
- Auto-ban only on: domain blocklist match, strict pHash, or dual signal
- Fuzzy pHash alone never auto-bans

## Commands

`/about` · `/get-hash` · `/add-scam` · `/remove-scam` · `/add-domain` · `/remove-domain` · `/list-domains` · `/config`

## Maintenance

Blocklist sync and dependency updates are actively maintained; see [CHANGELOG.md](CHANGELOG.md) and Releases.

## License

MIT — see [LICENSE](LICENSE). Branding credit appreciated but not required: [BRANDING.md](BRANDING.md).

Created by [Vorlaxen](https://vorlaxen.com)
