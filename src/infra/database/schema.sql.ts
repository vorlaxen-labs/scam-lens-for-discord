export const MIGRATION_SQL = `
CREATE TABLE IF NOT EXISTS blocked_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  domain TEXT NOT NULL,
  source TEXT NOT NULL,
  added_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS scam_hashes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT,
  hash TEXT NOT NULL,
  label TEXT,
  source TEXT NOT NULL,
  added_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS allowed_domains (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guild_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  added_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guild_settings (
  guild_id TEXT PRIMARY KEY,
  log_channel_id TEXT,
  phash_threshold INTEGER NOT NULL DEFAULT 8,
  phash_strict_threshold INTEGER NOT NULL DEFAULT 3,
  action_mode INTEGER NOT NULL DEFAULT 1,
  enabled INTEGER NOT NULL DEFAULT 1,
  exempt_role_ids TEXT NOT NULL DEFAULT '[]',
  skip_webhooks INTEGER NOT NULL DEFAULT 0,
  skip_bots INTEGER NOT NULL DEFAULT 1,
  timeout_duration_seconds INTEGER NOT NULL DEFAULT 3600,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS detection_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_id TEXT NOT NULL UNIQUE,
  guild_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  username TEXT,
  message_id TEXT,
  channel_id TEXT,
  detection_type TEXT NOT NULL,
  matched_value TEXT NOT NULL,
  hamming_distance INTEGER,
  action_taken TEXT NOT NULL,
  action_result TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS blocklist_seed_version (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  domains_hash TEXT NOT NULL,
  domain_count INTEGER NOT NULL,
  synced_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_global_blocked_domain
  ON blocked_domains(domain) WHERE guild_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_guild_blocked_domain
  ON blocked_domains(guild_id, domain) WHERE guild_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_global_scam_hash
  ON scam_hashes(hash) WHERE guild_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_guild_scam_hash
  ON scam_hashes(guild_id, hash) WHERE guild_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_guild_allowed_domain
  ON allowed_domains(guild_id, domain);

CREATE INDEX IF NOT EXISTS idx_detection_logs_guild ON detection_logs(guild_id);
CREATE INDEX IF NOT EXISTS idx_detection_logs_created ON detection_logs(created_at);
`;
