import { describe, expect, it, vi } from 'vitest';
import { DetectionLogService } from '../../src/services/detection-log.service.js';

describe('DetectionLogService', () => {
  const repository = {
    insert: vi.fn(),
    findByOperationId: vi.fn(),
    markRestored: vi.fn(),
  };

  const client = {
    channels: { fetch: vi.fn() },
    guilds: { fetch: vi.fn() },
    user: { id: 'bot-id' },
  };

  const service = new DetectionLogService(repository as never, client as never);

  it('creates SL-prefixed operation ids', () => {
    expect(service.createOperationId()).toMatch(/^SL-/);
  });

  it('delegates repository lookups and restore markers', () => {
    repository.findByOperationId.mockReturnValue({ operationId: 'SL-TEST' });
    repository.markRestored.mockReturnValue(true);

    expect(service.findByOperationId('SL-TEST')).toEqual({ operationId: 'SL-TEST' });
    expect(service.markRestored('SL-TEST', 'mod-1')).toBe(true);
  });

  it('builds about embed payload with link buttons', () => {
    const payload = service.buildAboutEmbed({
      version: '0.1.0',
      globalDomainCount: 100,
      globalHashCount: 10,
      guildCount: 2,
      guild: {
        enabled: true,
        actionMode: 1,
        phashThreshold: 8,
        phashStrictThreshold: 3,
        customDomainCount: 1,
        logChannelId: 'channel-1',
        guildHashCount: 4,
      },
    });

    expect(payload.embeds).toHaveLength(1);
    expect(payload.components).toHaveLength(1);
    expect(payload.components[0]?.components).toHaveLength(4);
    expect(payload.components[0]?.components[0]?.data.label).toBe('Add to Server');
  });
});
