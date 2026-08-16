import type Database from 'better-sqlite3';
import type { ActionMode, GuildSettings } from '../../../shared/types/index.js';

interface GuildSettingsRow {
  guild_id: string;
  log_channel_id: string | null;
  phash_threshold: number;
  phash_strict_threshold: number;
  action_mode: number;
  enabled: number;
  exempt_role_ids: string;
  skip_webhooks: number;
  skip_bots: number;
  timeout_duration_seconds: number;
}

function mapRow(row: GuildSettingsRow): GuildSettings {
  return {
    guildId: row.guild_id,
    logChannelId: row.log_channel_id,
    phashThreshold: row.phash_threshold,
    phashStrictThreshold: row.phash_strict_threshold,
    actionMode: row.action_mode as ActionMode,
    enabled: row.enabled === 1,
    exemptRoleIds: JSON.parse(row.exempt_role_ids) as string[],
    skipWebhooks: row.skip_webhooks === 1,
    skipBots: row.skip_bots === 1,
    timeoutDurationSeconds: row.timeout_duration_seconds,
  };
}

export class GuildSettingsRepository {
  constructor(private readonly db: Database.Database) {}

  findByGuildId(guildId: string): GuildSettings | null {
    const row = this.db
      .prepare('SELECT * FROM guild_settings WHERE guild_id = ?')
      .get(guildId) as GuildSettingsRow | undefined;
    return row ? mapRow(row) : null;
  }

  create(settings: GuildSettings): GuildSettings {
    this.db
      .prepare(
        `INSERT INTO guild_settings (
          guild_id, log_channel_id, phash_threshold, phash_strict_threshold,
          action_mode, enabled, exempt_role_ids, skip_webhooks, skip_bots,
          timeout_duration_seconds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        settings.guildId,
        settings.logChannelId,
        settings.phashThreshold,
        settings.phashStrictThreshold,
        settings.actionMode,
        settings.enabled ? 1 : 0,
        JSON.stringify(settings.exemptRoleIds),
        settings.skipWebhooks ? 1 : 0,
        settings.skipBots ? 1 : 0,
        settings.timeoutDurationSeconds,
      );
    return settings;
  }

  update(settings: GuildSettings): GuildSettings {
    this.db
      .prepare(
        `UPDATE guild_settings SET
          log_channel_id = ?, phash_threshold = ?, phash_strict_threshold = ?,
          action_mode = ?, enabled = ?, exempt_role_ids = ?,
          skip_webhooks = ?, skip_bots = ?, timeout_duration_seconds = ?,
          updated_at = datetime('now')
        WHERE guild_id = ?`,
      )
      .run(
        settings.logChannelId,
        settings.phashThreshold,
        settings.phashStrictThreshold,
        settings.actionMode,
        settings.enabled ? 1 : 0,
        JSON.stringify(settings.exemptRoleIds),
        settings.skipWebhooks ? 1 : 0,
        settings.skipBots ? 1 : 0,
        settings.timeoutDurationSeconds,
        settings.guildId,
      );
    return settings;
  }
}
