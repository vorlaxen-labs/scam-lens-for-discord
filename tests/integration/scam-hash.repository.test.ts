import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { ScamHashRepository } from '../../src/infra/database/repositories/scam-hash.repository.js';

describe('ScamHashRepository', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('upserts global and guild hashes and lists them for a guild', () => {
    const repo = new ScamHashRepository(db);

    repo.upsertGlobal('aaaaaaaaaaaaaaaa', 'global.webp', 'seed');
    repo.upsertGlobal('aaaaaaaaaaaaaaaa', 'global.webp', 'seed');
    repo.upsertGuild('guild-1', 'bbbbbbbbbbbbbbbb', 'guild.webp', 'admin-1');
    repo.upsertGuild('guild-2', 'cccccccccccccccc', 'other.webp', 'admin-2');

    expect(repo.listAll()).toHaveLength(3);
    expect(repo.listForGuild('guild-1').map((record) => record.hash)).toEqual([
      'aaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbb',
    ]);
  });

  it('removes guild hashes and ignores missing entries', () => {
    const repo = new ScamHashRepository(db);
    repo.upsertGuild('guild-1', 'bbbbbbbbbbbbbbbb', 'guild.webp', 'admin-1');

    expect(repo.removeGuildHash('guild-1', 'bbbbbbbbbbbbbbbb')).toBe(true);
    expect(repo.removeGuildHash('guild-1', 'bbbbbbbbbbbbbbbb')).toBe(false);
    expect(repo.listForGuild('guild-1')).toEqual([]);
  });
});
