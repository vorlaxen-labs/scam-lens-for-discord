import Database from 'better-sqlite3';
import { describe, expect, it, afterEach } from 'vitest';
import { applySchemaPatches } from '../../src/infra/database/schema-patches.js';

describe('applySchemaPatches', () => {
  let db: Database.Database | undefined;

  afterEach(() => {
    db?.close();
    db = undefined;
  });

  it('adds quarantine and restore columns to legacy schemas idempotently', () => {
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE guild_settings (
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

      CREATE TABLE detection_logs (
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
    `);

    applySchemaPatches(db);
    applySchemaPatches(db);

    const guildColumns = db
      .prepare('PRAGMA table_info(guild_settings)')
      .all()
      .map((row) => (row as { name: string }).name);
    const logColumns = db
      .prepare('PRAGMA table_info(detection_logs)')
      .all()
      .map((row) => (row as { name: string }).name);

    expect(guildColumns).toContain('timeout_enabled');
    expect(guildColumns).toContain('quarantine_fuzzy_images');
    expect(guildColumns).toContain('quarantine_duration_seconds');
    expect(logColumns).toContain('trust_score');
    expect(logColumns).toContain('restored_at');
    expect(logColumns).toContain('restored_by');
  });
});
