import Database from 'better-sqlite3';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { MIGRATION_SQL } from '../../src/infra/database/schema.sql.js';
import { BlockedDomainRepository } from '../../src/infra/database/repositories/blocked-domain.repository.js';

describe('BlockedDomainRepository partial unique indexes', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(MIGRATION_SQL);
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
