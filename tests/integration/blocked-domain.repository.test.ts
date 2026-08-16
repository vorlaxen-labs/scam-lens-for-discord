import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { BlockedDomainRepository } from '../../src/infra/database/repositories/blocked-domain.repository.js';

describe('BlockedDomainRepository partial unique indexes', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('prevents duplicate global domains', () => {
    const repo = new BlockedDomainRepository(db);
    repo.upsertGlobal('evil.com', 'seed');
    repo.upsertGlobal('evil.com', 'seed');
    expect(repo.listGlobalDomains()).toEqual(['evil.com']);
  });

  it('manages guild domains and stale global cleanup', () => {
    const repo = new BlockedDomainRepository(db);
    repo.upsertGlobal('seed.com', 'seed');
    repo.upsertGlobal('stale.com', 'seed');
    repo.upsertGuild('guild-1', 'guild.evil', 'admin-1');

    expect(repo.listGuildDomains('guild-1')).toEqual(['guild.evil']);
    expect(repo.listGuildDomainRecords('guild-1')[0]).toMatchObject({
      domain: 'guild.evil',
      addedBy: 'admin-1',
    });

    expect(repo.removeGuildDomain('guild-1', 'guild.evil')).toBe(true);
    expect(repo.removeGuildDomain('guild-1', 'guild.evil')).toBe(false);
    expect(repo.removeStaleGlobalDomains(new Set(['seed.com']))).toBe(1);
    expect(repo.listGlobalDomains()).toEqual(['seed.com']);
  });
});
