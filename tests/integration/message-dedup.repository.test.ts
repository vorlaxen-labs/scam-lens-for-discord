import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from '../helpers/test-db.js';
import { MessageDedupRepository } from '../../src/infra/database/repositories/message-dedup.repository.js';

describe('MessageDedupRepository', () => {
  let db: Database.Database;
  let repo: MessageDedupRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new MessageDedupRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('claims a message only once', () => {
    expect(repo.tryClaim('msg-100')).toBe(true);
    expect(repo.tryClaim('msg-100')).toBe(false);
    expect(repo.tryClaim('msg-101')).toBe(true);
  });

  it('purges old processed messages', () => {
    db.prepare(
      `INSERT INTO processed_messages (message_id, processed_at) VALUES (?, datetime('now', '-48 hours'))`,
    ).run('old-msg');
    db.prepare(
      `INSERT INTO processed_messages (message_id, processed_at) VALUES (?, datetime('now'))`,
    ).run('new-msg');

    const removed = repo.purgeOlderThan(24);
    expect(removed).toBe(1);
    expect(repo.tryClaim('old-msg')).toBe(true);
    expect(repo.tryClaim('new-msg')).toBe(false);
  });
});
