import Database from 'better-sqlite3';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { MIGRATION_SQL } from '../../src/infra/database/schema.sql.js';
import { GuildSettingsRepository } from '../../src/infra/database/repositories/guild-settings.repository.js';
import { GuildSettingsService } from '../../src/services/guild-settings.service.js';

describe('GuildSettingsService', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
    db.exec(MIGRATION_SQL);
  });

  afterEach(() => {
    db.close();
  });

  it('lazy-inits new guild with log-only mode', () => {
    const service = new GuildSettingsService(new GuildSettingsRepository(db));
    const settings = service.getOrCreate('guild-1');
    expect(settings.actionMode).toBe(2);
    expect(settings.phashThreshold).toBe(8);
  });
});
