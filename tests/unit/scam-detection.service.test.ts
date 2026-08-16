import { describe, expect, it } from 'vitest';
import { ScamDetectionService } from '../../src/services/scam-detection.service.js';
import type { GuildSettings } from '../../src/shared/types/index.js';

function createSettings(overrides: Partial<GuildSettings> = {}): GuildSettings {
  return {
    guildId: '1',
    logChannelId: null,
    phashThreshold: 8,
    phashStrictThreshold: 3,
    actionMode: 1,
    enabled: true,
    exemptRoleIds: [],
    skipWebhooks: false,
    skipBots: true,
    timeoutDurationSeconds: 3600,
    ...overrides,
  };
}

describe('ScamDetectionService.shouldAutoBan', () => {
  const service = new ScamDetectionService(
    { getOrCreate: () => createSettings(), update: (s) => s } as never,
    { createOperationId: () => 'SL-test', record: async () => 'SL-test' } as never,
  );

  it('auto-bans on domain match', () => {
    expect(
      service.shouldAutoBan(
        createSettings(),
        [{ domain: 'login.evil.com', blockedDomain: 'evil.com', source: 'global' }],
        [],
      ),
    ).toBe(true);
  });

  it('auto-bans on strict pHash match', () => {
    expect(
      service.shouldAutoBan(
        createSettings(),
        [],
        [{ hash: 'abc', matchedHash: 'abd', hammingDistance: 2, label: null }],
      ),
    ).toBe(true);
  });

  it('does not auto-ban on fuzzy pHash alone', () => {
    expect(
      service.shouldAutoBan(
        createSettings(),
        [],
        [{ hash: 'abc', matchedHash: 'xyz', hammingDistance: 7, label: null }],
      ),
    ).toBe(false);
  });
});
