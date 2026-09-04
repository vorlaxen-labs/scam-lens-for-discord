import type Database from 'better-sqlite3';

export interface ScamHashRecord {
  id: number;
  guildId: string | null;
  hash: string;
  label: string | null;
  source: string;
}

export class ScamHashRepository {
  constructor(private readonly db: Database.Database) {}

  upsertGlobal(hash: string, label: string | null, source: string): void {
    this.db
      .prepare(
        `INSERT INTO scam_hashes (guild_id, hash, label, source)
         VALUES (NULL, ?, ?, ?)
         ON CONFLICT(hash) WHERE guild_id IS NULL
         DO UPDATE SET label = excluded.label, source = excluded.source`,
      )
      .run(hash, label, source);
  }

  upsertGuild(guildId: string, hash: string, label: string | null, addedBy: string): void {
    this.db
      .prepare(
        `INSERT INTO scam_hashes (guild_id, hash, label, source, added_by)
         VALUES (?, ?, ?, 'command', ?)
         ON CONFLICT(guild_id, hash) WHERE guild_id IS NOT NULL
         DO UPDATE SET label = excluded.label, added_by = excluded.added_by`,
      )
      .run(guildId, hash, label, addedBy);
  }

  removeAllGlobalSeed(): number {
    const result = this.db
      .prepare(`DELETE FROM scam_hashes WHERE guild_id IS NULL AND source = 'seed'`)
      .run();
    return result.changes;
  }

  removeGuildHash(guildId: string, hash: string): boolean {
    const result = this.db
      .prepare('DELETE FROM scam_hashes WHERE guild_id = ? AND hash = ?')
      .run(guildId, hash);
    return result.changes > 0;
  }

  listAll(): ScamHashRecord[] {
    const rows = this.db
      .prepare('SELECT id, guild_id, hash, label, source FROM scam_hashes')
      .all() as Array<{
      id: number;
      guild_id: string | null;
      hash: string;
      label: string | null;
      source: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      guildId: row.guild_id,
      hash: row.hash,
      label: row.label,
      source: row.source,
    }));
  }

  listForGuild(guildId: string): ScamHashRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, guild_id, hash, label, source FROM scam_hashes
         WHERE guild_id IS NULL OR guild_id = ?`,
      )
      .all(guildId) as Array<{
      id: number;
      guild_id: string | null;
      hash: string;
      label: string | null;
      source: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      guildId: row.guild_id,
      hash: row.hash,
      label: row.label,
      source: row.source,
    }));
  }
}
