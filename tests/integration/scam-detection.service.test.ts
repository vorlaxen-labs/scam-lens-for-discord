import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ScamDetectionService } from '../../src/services/scam-detection.service.js';
import type { GuildSettingsService } from '../../src/services/guild-settings.service.js';
import type { DetectionLogService } from '../../src/services/detection-log.service.js';
import type { GuildSettings } from '../../src/shared/types/index.js';
import { createMockMessage, getMessageDeleteMock } from '../helpers/mock-message.js';

function createSettings(overrides: Partial<GuildSettings> = {}): GuildSettings {
  return {
    guildId: 'guild-1',
    logChannelId: null,
    phashThreshold: 8,
    phashStrictThreshold: 3,
    actionMode: 1,
    enabled: true,
    exemptRoleIds: [],
    skipWebhooks: false,
    skipBots: true,
    timeoutDurationSeconds: 3600,
    timeoutEnabled: false,
    quarantineFuzzyImages: false,
    quarantineDurationSeconds: 900,
    ...overrides,
  };
}

describe('ScamDetectionService.handleDetection', () => {
  let settings: GuildSettings;
  let recordMock: ReturnType<typeof vi.fn>;
  let service: ScamDetectionService;

  beforeEach(() => {
    settings = createSettings();
    recordMock = vi.fn(async () => 'SL-TEST');

    const guildSettingsService = {
      getOrCreate: vi.fn(() => settings),
      update: vi.fn((value: GuildSettings) => value),
    } as unknown as GuildSettingsService;

    const detectionLogService = {
      createOperationId: vi.fn(() => 'SL-TEST'),
      record: recordMock,
    } as unknown as DetectionLogService;

    service = new ScamDetectionService(guildSettingsService, detectionLogService);
  });

  it('deletes message and logs global domain hits without auto-ban', async () => {
    const message = createMockMessage({
      content: 'https://login.evil.com',
    });

    await service.handleDetection(message, {
      domainMatches: [{ domain: 'login.evil.com', blockedDomain: 'evil.com', source: 'global' }],
      imageMatches: [],
    });

    expect(getMessageDeleteMock(message)).toHaveBeenCalled();
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actionTaken: 'delete',
        trustScore: 60,
        actionResult: 'delete:success',
      }),
    );
  });

  it('does not delete in log-only mode', async () => {
    settings.actionMode = 2;
    const message = createMockMessage();

    await service.handleDetection(message, {
      domainMatches: [{ domain: 'login.evil.com', blockedDomain: 'evil.com', source: 'global' }],
      imageMatches: [],
    });

    expect(getMessageDeleteMock(message)).not.toHaveBeenCalled();
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actionTaken: 'log',
        actionResult: 'log_only',
      }),
    );
  });

  it('skips processing when guild disabled', async () => {
    settings.enabled = false;
    const message = createMockMessage();

    await service.handleDetection(message, {
      domainMatches: [{ domain: 'login.evil.com', blockedDomain: 'evil.com', source: 'global' }],
      imageMatches: [],
    });

    expect(recordMock).not.toHaveBeenCalled();
  });

  it('records dual detection with higher trust score', async () => {
    const message = createMockMessage();
    await service.handleDetection(message, {
      domainMatches: [{ domain: 'login.evil.com', blockedDomain: 'evil.com', source: 'global' }],
      imageMatches: [
        {
          hash: 'abc',
          matchedHash: 'abd',
          hammingDistance: 7,
          label: 'seed.webp',
          hashSource: 'seed',
        },
      ],
    });

    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        detectionType: 'dual',
        trustScore: 95,
      }),
    );
  });

  it('applies timeout on detections when enabled and ban is not used', async () => {
    settings.timeoutEnabled = true;
    const timeoutFn = vi.fn(async () => undefined);
    const botPermissions = { has: () => true };

    const member = {
      bannable: true,
      moderatable: true,
      timeout: timeoutFn,
      guild: {
        members: {
          me: { permissions: botPermissions },
        },
      },
    };

    const guild = {
      id: 'guild-1',
      members: {
        fetch: vi.fn(async () => member),
        me: { permissions: botPermissions },
      },
    };

    const message = createMockMessage({ guild, member });
    Object.assign(message.channel as object, { guild });

    await service.handleDetection(message, {
      domainMatches: [{ domain: 'login.evil.com', blockedDomain: 'evil.com', source: 'global' }],
      imageMatches: [],
    });

    expect(timeoutFn).toHaveBeenCalled();
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actionTaken: 'delete+timeout',
        actionResult: 'delete:success,timeout:success',
      }),
    );
  });

  it('skips timeout when high-confidence ban is issued', async () => {
    settings.actionMode = 0;
    settings.timeoutEnabled = true;
    const timeoutFn = vi.fn(async () => undefined);
    const banFn = vi.fn(async () => undefined);
    const botPermissions = { has: () => true };

    const member = {
      bannable: true,
      moderatable: true,
      timeout: timeoutFn,
      ban: banFn,
      guild: {
        members: {
          me: { permissions: botPermissions },
        },
      },
    };

    const guild = {
      id: 'guild-1',
      members: {
        fetch: vi.fn(async () => member),
        me: { permissions: botPermissions },
      },
    };

    const message = createMockMessage({ guild, member });
    Object.assign(message.channel as object, { guild });

    await service.handleDetection(message, {
      domainMatches: [{ domain: 'x.evil.com', blockedDomain: 'evil.com', source: 'guild' }],
      imageMatches: [],
    });

    expect(banFn).toHaveBeenCalled();
    expect(timeoutFn).not.toHaveBeenCalled();
    expect(recordMock).toHaveBeenCalledWith(
      expect.objectContaining({
        actionTaken: 'ban',
      }),
    );
  });
});
