import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { GuildSettingsRepository } from '../../src/infra/database/repositories/guild-settings.repository.js';
import { GuildSettingsService } from '../../src/services/guild-settings.service.js';

describe('GuildSettingsService', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('lazy-inits new guild with log-only mode and timeout disabled', () => {
    const service = new GuildSettingsService(new GuildSettingsRepository(db));
    const settings = service.getOrCreate('guild-1');
    expect(settings.actionMode).toBe(2);
    expect(settings.phashThreshold).toBe(8);
    expect(settings.timeoutEnabled).toBe(false);
    expect(settings.timeoutDurationSeconds).toBeGreaterThan(0);
  });
});
