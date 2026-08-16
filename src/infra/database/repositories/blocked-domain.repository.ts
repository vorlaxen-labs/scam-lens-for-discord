import type Database from 'better-sqlite3';

export interface BlockedDomainRecord {
  id: number;
  guildId: string | null;
  domain: string;
  source: string;
  addedBy: string | null;
}

export class BlockedDomainRepository {
  constructor(private readonly db: Database.Database) {}

  upsertGlobal(domain: string, source: string): void {
    this.db
      .prepare(
        `INSERT INTO blocked_domains (guild_id, domain, source)
         VALUES (NULL, ?, ?)
         ON CONFLICT(domain) WHERE guild_id IS NULL
         DO UPDATE SET source = excluded.source`,
      )
      .run(domain, source);
  }

  upsertGuild(guildId: string, domain: string, addedBy: string): void {
    this.db
      .prepare(
        `INSERT INTO blocked_domains (guild_id, domain, source, added_by)
         VALUES (?, ?, 'command', ?)
         ON CONFLICT(guild_id, domain) WHERE guild_id IS NOT NULL
         DO UPDATE SET added_by = excluded.added_by`,
      )
      .run(guildId, domain, addedBy);
  }

  removeGuildDomain(guildId: string, domain: string): boolean {
    const result = this.db
      .prepare('DELETE FROM blocked_domains WHERE guild_id = ? AND domain = ?')
      .run(guildId, domain);
    return result.changes > 0;
  }

  listGlobalDomains(): string[] {
    const rows = this.db
      .prepare('SELECT domain FROM blocked_domains WHERE guild_id IS NULL ORDER BY domain')
      .all() as Array<{ domain: string }>;
    return rows.map((row) => row.domain);
  }

  listGuildDomains(guildId: string): string[] {
    const rows = this.db
      .prepare('SELECT domain FROM blocked_domains WHERE guild_id = ? ORDER BY domain')
      .all(guildId) as Array<{ domain: string }>;
    return rows.map((row) => row.domain);
  }

  removeStaleGlobalDomains(validDomains: Set<string>): number {
    const globals = this.listGlobalDomains();
    let removed = 0;
    const deleteStmt = this.db.prepare(
      'DELETE FROM blocked_domains WHERE guild_id IS NULL AND domain = ?',
    );
    for (const domain of globals) {
      if (!validDomains.has(domain)) {
        deleteStmt.run(domain);
        removed += 1;
      }
    }
    return removed;
  }
}
