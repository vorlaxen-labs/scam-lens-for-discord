# Contributing

Thanks for helping improve Scam Lens for Discord.

Search [existing issues](https://github.com/vorlaxen-labs/scam-lens-for-discord/issues) before opening a new one. For a large change, open an issue first so the behavior is agreed before the code.

## Setup

Node.js 22 or newer, and pnpm 9 (`packageManager` in `package.json`).

```bash
git clone https://github.com/vorlaxen-labs/scam-lens-for-discord.git
cd scam-lens-for-discord
pnpm install
cp env/.env.example env/.env.development
# Fill BOT_TOKEN and BOT_CLIENT_ID locally. Never commit that file.
pnpm dev
```

Portal steps: [docs/setup.md](docs/setup.md).

## Before you open a pull request

```bash
pnpm lint
pnpm test:ci
pnpm build
```

`pnpm test:ci` is typecheck plus coverage, which is what [CI](.github/workflows/ci.yml) runs before the build.

- One logical change per pull request.
- Add or update tests under `tests/` when behavior changes.
- Update [README.md](README.md), [docs/](docs/), or [CHANGELOG.md](CHANGELOG.md) when user-visible behavior changes.
- Use the [pull request template](.github/pull_request_template.md).

## What belongs here

| Area | Where |
|------|--------|
| Detection, commands, SQLite | `src/` |
| Tests | `tests/` |
| Domain list policy | [data/text/SOURCES.md](data/text/SOURCES.md) |
| Reference scam screenshots | `data/images/`, then `pnpm build:image-dataset` |

Do not commit `env/.env.development`, `env/.env.production`, bot tokens, or `data/scam-lens.db`.

## Code of conduct

Participation follows [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report security issues through [SECURITY.md](SECURITY.md), not a public issue.
