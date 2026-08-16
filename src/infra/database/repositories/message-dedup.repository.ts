import type Database from 'better-sqlite3';

export class MessageDedupRepository {
  constructor(private readonly db: Database.Database) {}

  /** Returns true if this message was newly claimed for processing. */
  tryClaim(messageId: string): boolean {
    const result = this.db
      .prepare('INSERT OR IGNORE INTO processed_messages (message_id) VALUES (?)')
      .run(messageId);
    return result.changes > 0;
  }

  purgeOlderThan(hours: number): number {
    const result = this.db
      .prepare(
        `DELETE FROM processed_messages
         WHERE processed_at < datetime('now', ?)`,
      )
      .run(`-${hours} hours`);
    return result.changes;
  }
}
