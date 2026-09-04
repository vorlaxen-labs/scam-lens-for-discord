# Changelog

## 0.2.0 — Unreleased

- Action modes simplified to `0`–`2` (delete/ban presets; logging always recorded)
- Timeout decoupled from action mode — `/config timeout` with enabled + duration per guild
- Removed mode-specific timeout/quarantine and redundant ban+timeout combo

## 0.1.0 — 2026-08-15

- Initial release
- pHash image detection + domain blocklist (~21k seed domains)
- Safe action modes with high-confidence auto-ban rules
- Slash commands for configuration and blocklist management
