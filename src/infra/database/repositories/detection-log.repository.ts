import type Database from 'better-sqlite3';
import type { DetectionContext } from '../../../shared/types/index.js';

export class AllowedDomainRepository {
  constructor(private readonly db: Database.Database) {}

  add(guildId: string, domain: string, addedBy: string): void {
    this.db
      .prepare(
        `INSERT INTO allowed_domains (guild_id, domain, added_by)
         VALUES (?, ?, ?)
         ON CONFLICT(guild_id, domain) DO NOTHING`,
      )
      .run(guildId, domain, addedBy);
  }

  remove(guildId: string, domain: string): boolean {
    const result = this.db
      .prepare('DELETE FROM allowed_domains WHERE guild_id = ? AND domain = ?')
      .run(guildId, domain);
    return result.changes > 0;
  }

  listForGuild(guildId: string): string[] {
    const rows = this.db
      .prepare('SELECT domain FROM allowed_domains WHERE guild_id = ? ORDER BY domain')
      .all(guildId) as Array<{ domain: string }>;
    return rows.map((row) => row.domain);
  }
}

export class DetectionLogRepository {
  constructor(private readonly db: Database.Database) {}

  insert(context: DetectionContext): void {
    this.db
      .prepare(
        `INSERT INTO detection_logs (
          operation_id, guild_id, user_id, username, message_id, channel_id,
          detection_type, matched_value, hamming_distance, action_taken,
          action_result, metadata_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        context.operationId,
        context.guildId,
        context.userId,
        context.username,
        context.messageId,
        context.channelId,
        context.detectionType,
        context.matchedValue,
        context.hammingDistance,
        context.actionTaken,
        context.actionResult,
        context.metadataJson,
      );
  }
}

export class SeedVersionRepository {
  constructor(private readonly db: Database.Database) {}

  get(): { domainsHash: string; domainCount: number; syncedAt: string } | null {
    const row = this.db
      .prepare('SELECT domains_hash, domain_count, synced_at FROM blocklist_seed_version WHERE id = 1')
      .get() as { domains_hash: string; domain_count: number; synced_at: string } | undefined;
    if (!row) return null;
    return {
      domainsHash: row.domains_hash,
      domainCount: row.domain_count,
      syncedAt: row.synced_at,
    };
  }

  upsert(domainsHash: string, domainCount: number): void {
    this.db
      .prepare(
        `INSERT INTO blocklist_seed_version (id, domains_hash, domain_count, synced_at)
         VALUES (1, ?, ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET
           domains_hash = excluded.domains_hash,
           domain_count = excluded.domain_count,
           synced_at = datetime('now')`,
      )
      .run(domainsHash, domainCount);
  }
}
