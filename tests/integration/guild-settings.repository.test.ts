import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { createTestDb } from '../helpers/test-db.js';
import { GuildSettingsRepository } from '../../src/infra/database/repositories/guild-settings.repository.js';

describe('GuildSettingsRepository', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('creates, finds, and updates guild settings', () => {
    const repo = new GuildSettingsRepository(db);
    const created = repo.create({
      guildId: 'guild-1',
      logChannelId: 'channel-1',
      phashThreshold: 8,
      phashStrictThreshold: 3,
      actionMode: 1,
      enabled: true,
      exemptRoleIds: ['role-1'],
      skipWebhooks: false,
      skipBots: true,
      timeoutDurationSeconds: 600,
      quarantineFuzzyImages: true,
      quarantineDurationSeconds: 900,
    });

    expect(repo.findByGuildId('guild-1')).toEqual(created);

    const updated = repo.update({
      ...created,
      phashThreshold: 10,
      logChannelId: 'channel-2',
    });

    expect(updated.phashThreshold).toBe(10);
    expect(repo.findByGuildId('guild-1')?.logChannelId).toBe('channel-2');
    expect(repo.findByGuildId('missing')).toBeNull();
  });
});
