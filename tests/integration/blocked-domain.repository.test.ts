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
});
