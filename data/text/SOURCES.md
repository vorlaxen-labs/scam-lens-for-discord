# Domain Blocklist Source

- **Source:** [nikolaischunk/discord-phishing-links](https://github.com/nikolaischunk/discord-phishing-links) — `txt/domain-list.txt`
- **Local file:** `data/text/domains.txt` (~21,903 entries, normalized)
- **Update policy:** Maintainer sync via PR when upstream changes; no fixed SLA
- **Disclaimer:** Third-party curated list — suffix match; test with log-only mode first

## Image seeds

`data/images/` contains maintainer-provided scam screenshot examples. `pnpm build:image-dataset` writes their pHash rows to `data/image-hashes.csv`. The bot loads that file on boot and does not decode the screenshots again.
