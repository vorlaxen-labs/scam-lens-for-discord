# Security Policy

## Supported versions

Security fixes land on `main` and ship with the latest release.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | Yes       |
| Older   | No        |

## Reporting a vulnerability

**Do not open a public issue for a security problem.** Do not paste `BOT_TOKEN`, database files, or member identifiers into a public issue, pull request, or discussion.

1. Use [GitHub private vulnerability reporting](https://github.com/vorlaxen-labs/scam-lens-for-discord/security/advisories/new).

Include:

- What is affected and what an attacker can do
- Steps to reproduce
- The version (`/about` or the git revision)
- A suggested fix, if you have one

We aim to acknowledge reports within 5 business days and will coordinate disclosure after a fix is available.

## In scope

- Exposure of the bot token, owner ids, or other secrets
- A moderation action applied to the wrong message or the wrong member
- A slash command that runs without the permission the command requires
- SQL or path handling bugs in the SQLite layer

## Out of scope

- A domain on the third-party seed list that you want ignored. Use `/add-allow-domain`, or open a normal issue.
- A perceptual-hash distance you disagree with. Tune `/config threshold` and `/config strict-threshold`, or use `/config restore`.
- Discord platform outages.

## Safe operation

- Keep action mode `2` or `1` until the log channel matches what you expect. Mode `0` bans on a high-confidence hit.
- Run one process per SQLite file.
- Treat `env/.env.development` and `env/.env.production` as local secrets. Only `env/.env.example` belongs in git.
