import { afterEach, describe, expect, it, vi } from 'vitest';

describe('TelemetryService', () => {
  const send = vi.fn(async () => undefined);
  const client = {
    user: { id: 'bot-id' },
    channels: {
      fetch: vi.fn(async () => ({
        isTextBased: () => true,
        permissionsFor: () => ({
          has: () => true,
        }),
        send,
      })),
    },
  };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    send.mockClear();
    vi.mocked(client.channels.fetch).mockClear();
  });

  it('logs bot_ready telemetry to central channel for guild events', async () => {
    vi.stubEnv('LOG_CHANNEL_ID', 'central-log');
    vi.stubEnv('TELEMETRY_ENABLED', 'true');
    vi.stubEnv('TELEMETRY_GUILD_EVENTS', 'true');
    vi.stubEnv('TELEMETRY_COMMANDS', 'false');

    const { TelemetryService } = await import('../../src/services/telemetry.service.js');
    const service = new TelemetryService(client as never);

    await service.emit('bot_ready', {
      guildCount: 2,
      guilds: [{ id: 'g1', name: 'Alpha', memberCount: 10 }],
      domains: 100,
      referenceImageHashes: 4,
    });

    expect(client.channels.fetch).toHaveBeenCalledWith('central-log');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0]?.embeds?.[0]?.title).toBe('📡 Bot ready');
  });

  it('skips central channel when telemetry is disabled', async () => {
    vi.stubEnv('LOG_CHANNEL_ID', 'central-log');
    vi.stubEnv('TELEMETRY_ENABLED', 'false');

    const { TelemetryService } = await import('../../src/services/telemetry.service.js');
    const service = new TelemetryService(client as never);

    await service.emit('guild_join', {
      guildId: 'g1',
      guildName: 'Test Guild',
      memberCount: 5,
    });

    expect(client.channels.fetch).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('notifies central channel for guild join events', async () => {
    vi.stubEnv('LOG_CHANNEL_ID', 'central-log');
    vi.stubEnv('TELEMETRY_ENABLED', 'true');
    vi.stubEnv('TELEMETRY_GUILD_EVENTS', 'true');

    const { TelemetryService } = await import('../../src/services/telemetry.service.js');
    const service = new TelemetryService(client as never);

    await service.emit('guild_join', {
      guildId: '1493686429216280746',
      guildName: 'sex',
      memberCount: 3,
      ownerId: 'owner-1',
      ownerTag: 'owner#0001',
      addedById: 'adder-1',
      addedByTag: 'adder#0001',
    });

    expect(send).toHaveBeenCalledTimes(1);
    const embed = send.mock.calls[0]?.[0]?.embeds?.[0];
    expect(embed?.title).toBe('📡 Bot joined server');
    expect(embed?.fields?.some((field: { value: string }) => field.value.includes('sex'))).toBe(true);
  });
});
