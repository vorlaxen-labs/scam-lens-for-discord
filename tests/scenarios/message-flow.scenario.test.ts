import { afterEach, describe, expect, it, vi } from 'vitest';
import type { GuildSettings } from '../../src/shared/types/index.js';
import MessageCreateEvent from '../../src/events/message-create.event.js';
import { client } from '../../src/infra/bot/client.js';
import { createMockMessage, getMessageDeleteMock } from '../helpers/mock-message.js';
import { buildDetectionMessage } from '../shared/scenario-message.js';
import { createScenarioWorld, seedBlocklist, type ScenarioWorld } from '../shared/scenario-world.js';
import type { Message } from 'discord.js';

function flowMessage(input: {
  id: string;
  content?: string | null;
  author?: { id: string; username: string; bot?: boolean };
  webhookId?: string | null;
}): Message {
  return createMockMessage({
    id: input.id,
    content: input.content ?? null,
    author: input.author,
    webhookId: input.webhookId,
  });
}

describe('message detection flow', () => {
  let world: ScenarioWorld;

  afterEach(() => {
    client.services = null;
    world?.close();
  });

  it('claims a message once, then deletes, skips, allowlists, or bans', async () => {
    world = createScenarioWorld();
    seedBlocklist(world, {
      globalDomains: ['evil.com', 'discord-gift.com'],
      guildDomains: ['custom-scam.net'],
    });
    const apply = (patch: Partial<GuildSettings>) => {
      const current = world.guildSettings.getOrCreate('guild-1');
      world.guildSettings.update({ ...current, ...patch });
    };
    apply({
      actionMode: 1,
      enabled: true,
      skipBots: true,
      skipWebhooks: false,
      timeoutEnabled: false,
      exemptRoleIds: [],
    });

    client.services = null;
    await MessageCreateEvent.execute(flowMessage({
      id: 'm-offline',
      content: 'https://login.evil.com',
    }));
    expect(world.records).toHaveLength(0);
    expect(world.dedup.tryClaim('m-offline')).toBe(true);

    client.services = world.asServices();

    const partialFail = flowMessage({
      id: 'm-partial-fail',
      content: 'https://login.evil.com',
    });
    Object.assign(partialFail, {
      partial: true,
      fetch: vi.fn(async () => {
        throw new Error('unknown message');
      }),
    });
    await MessageCreateEvent.execute(partialFail);
    expect(world.records).toHaveLength(0);
    expect(world.dedup.tryClaim('m-partial-fail')).toBe(true);

    const fetched = flowMessage({
      id: 'm-partial-ok',
      content: 'https://login.evil.com/gift',
    });
    const partialOk = flowMessage({
      id: 'm-partial-ok',
      content: 'hello from the shell',
    });
    Object.assign(partialOk, {
      partial: true,
      fetch: vi.fn(async () => fetched),
    });
    await MessageCreateEvent.execute(partialOk);
    expect(getMessageDeleteMock(fetched)).toHaveBeenCalledTimes(1);
    expect(getMessageDeleteMock(partialOk)).not.toHaveBeenCalled();
    expect(world.records).toHaveLength(1);
    expect(world.records[0]).toMatchObject({
      messageId: 'm-partial-ok',
      actionTaken: 'delete',
      detectionType: 'domain',
      trustScore: 60,
    });

    const clean = flowMessage({ id: 'm-clean', content: 'hello team, standup at 10' });
    await MessageCreateEvent.execute(clean);
    await MessageCreateEvent.execute(clean);
    expect(world.records).toHaveLength(1);
    expect(getMessageDeleteMock(clean)).not.toHaveBeenCalled();
    expect(world.dedup.tryClaim('m-clean')).toBe(false);

    const phish = flowMessage({ id: 'm-phish', content: 'https://login.evil.com/free' });
    await MessageCreateEvent.execute(phish);
    await MessageCreateEvent.execute(phish);
    expect(world.records).toHaveLength(2);
    expect(getMessageDeleteMock(phish)).toHaveBeenCalledTimes(1);
    expect(world.records[1]).toMatchObject({
      actionTaken: 'delete',
      actionResult: 'delete:success',
      matchedValue: 'evil.com',
    });

    const bot = flowMessage({
      id: 'm-bot',
      content: 'https://login.evil.com',
      author: { id: 'bot-1', username: 'helper', bot: true },
    });
    await MessageCreateEvent.execute(bot);
    expect(world.records).toHaveLength(2);
    expect(world.dedup.tryClaim('m-bot')).toBe(true);

    const webhook = flowMessage({
      id: 'm-hook',
      content: 'https://free.discord-gift.com/nitro',
      webhookId: 'hook-1',
    });
    await MessageCreateEvent.execute(webhook);
    expect(world.records).toHaveLength(3);
    expect(world.records[2]).toMatchObject({
      matchedValue: 'discord-gift.com',
      actionTaken: 'delete',
    });

    apply({ skipWebhooks: true });
    const skippedHook = flowMessage({
      id: 'm-hook-skip',
      content: 'https://login.evil.com',
      webhookId: 'hook-2',
    });
    await MessageCreateEvent.execute(skippedHook);
    expect(world.records).toHaveLength(3);
    expect(world.dedup.tryClaim('m-hook-skip')).toBe(true);

    apply({ exemptRoleIds: ['role-exempt'] });
    const exempt = flowMessage({ id: 'm-exempt', content: 'https://login.evil.com' });
    Object.assign(exempt, {
      member: {
        roles: {
          cache: {
            some: (fn: (role: { id: string }) => boolean) => fn({ id: 'role-exempt' }),
          },
        },
      },
    });
    await MessageCreateEvent.execute(exempt);
    expect(world.records).toHaveLength(3);
    expect(world.dedup.tryClaim('m-exempt')).toBe(true);
    apply({ exemptRoleIds: [] });

    apply({ enabled: false });
    await MessageCreateEvent.execute(flowMessage({
      id: 'm-disabled',
      content: 'https://login.evil.com',
    }));
    expect(world.records).toHaveLength(3);
    expect(world.dedup.tryClaim('m-disabled')).toBe(true);
    apply({ enabled: true });

    world.blocklist.addGuildAllowedDomain('guild-1', 'evil.com', 'scenario');
    const allowed = flowMessage({ id: 'm-allowed', content: 'https://login.evil.com/still' });
    await MessageCreateEvent.execute(allowed);
    expect(world.records).toHaveLength(3);
    expect(getMessageDeleteMock(allowed)).not.toHaveBeenCalled();
    expect(world.dedup.tryClaim('m-allowed')).toBe(false);

    apply({ actionMode: 0 });
    const banned = buildDetectionMessage({
      id: 'm-ban',
      content: 'https://pay.custom-scam.net/checkout',
      member: 'full',
    });
    await MessageCreateEvent.execute(banned.message);
    expect(world.records).toHaveLength(4);
    expect(world.records[3]).toMatchObject({
      actionTaken: 'ban',
      actionResult: 'delete:success,ban:success',
      detectionType: 'domain',
      trustScore: 90,
      matchedValue: 'custom-scam.net',
    });
    expect(world.records[3]!.operationId).toMatch(/^SL-[0-9A-HJKMNP-TV-Z]{26}$/);
    expect(banned.deleteMock).toHaveBeenCalledTimes(1);
    expect(banned.banMock).toHaveBeenCalledTimes(1);
    expect(banned.timeoutMock).not.toHaveBeenCalled();
    expect(banned.dmMock).toHaveBeenCalledTimes(1);
  });
});
