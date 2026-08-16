import type Database from 'better-sqlite3';
import type { DetectionContext } from '../../../shared/types/index.js';

export interface DetectionLogRecord {
  operationId: string;
  guildId: string;
  userId: string;
  username: string | null;
  messageId: string | null;
  channelId: string | null;
  detectionType: string;
  matchedValue: string;
  hammingDistance: number | null;
  actionTaken: string;
  actionResult: string;
  metadataJson: string | null;
  trustScore: number | null;
  restoredAt: string | null;
  restoredBy: string | null;
  createdAt: string;
}

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
          action_result, metadata_json, trust_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        context.trustScore,
      );
  }

  findByOperationId(operationId: string): DetectionLogRecord | null {
    const row = this.db
      .prepare(
        `SELECT operation_id, guild_id, user_id, username, message_id, channel_id,
                detection_type, matched_value, hamming_distance, action_taken,
                action_result, metadata_json, trust_score, restored_at, restored_by, created_at
         FROM detection_logs WHERE operation_id = ?`,
      )
      .get(operationId) as
      | {
          operation_id: string;
          guild_id: string;
          user_id: string;
          username: string | null;
          message_id: string | null;
          channel_id: string | null;
          detection_type: string;
          matched_value: string;
          hamming_distance: number | null;
          action_taken: string;
          action_result: string;
          metadata_json: string | null;
          trust_score: number | null;
          restored_at: string | null;
          restored_by: string | null;
          created_at: string;
        }
      | undefined;

    if (!row) return null;

    return {
      operationId: row.operation_id,
      guildId: row.guild_id,
      userId: row.user_id,
      username: row.username,
      messageId: row.message_id,
      channelId: row.channel_id,
      detectionType: row.detection_type,
      matchedValue: row.matched_value,
      hammingDistance: row.hamming_distance,
      actionTaken: row.action_taken,
      actionResult: row.action_result,
      metadataJson: row.metadata_json,
      trustScore: row.trust_score,
      restoredAt: row.restored_at,
      restoredBy: row.restored_by,
      createdAt: row.created_at,
    };
  }

  markRestored(operationId: string, restoredBy: string): boolean {
    const result = this.db
      .prepare(
        `UPDATE detection_logs
         SET restored_at = datetime('now'), restored_by = ?
         WHERE operation_id = ? AND restored_at IS NULL`,
      )
      .run(restoredBy, operationId);
    return result.changes > 0;
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
