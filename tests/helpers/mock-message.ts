import { vi } from 'vitest';
import type { Message } from 'discord.js';

export function createMockMessage(overrides: {
  id?: string;
  guildId?: string;
  channelId?: string;
  content?: string | null;
  author?: { id: string; username: string; bot?: boolean };
  attachments?: Array<{ url: string; contentType: string | null; name?: string | null }>;
    embeds?: Array<{
      url?: string | null;
      title?: string | null;
      description?: string | null;
      image?: { url: string };
      thumbnail?: { url: string };
      fields?: Array<{ name: string; value: string }>;
    }>;
    components?: Array<{ components?: Array<{ url?: string }> }>;
  webhookId?: string | null;
  member?: { roles: { cache: { some: (fn: (role: { id: string }) => boolean) => boolean } } } | null;
  deletable?: boolean;
  guild?: { id: string; members: { fetch: () => Promise<unknown>; me?: unknown } };
} = {}): Message {
  const attachmentMap = new Map(
    (overrides.attachments ?? []).map((attachment, index) => [
      String(index),
      {
        url: attachment.url,
        contentType: attachment.contentType,
        name: attachment.name ?? null,
      },
    ]),
  );

  const deleteFn = vi.fn(async () => undefined);

  return {
    id: overrides.id ?? 'msg-1',
    guildId: overrides.guildId ?? 'guild-1',
    guild: overrides.guild ?? {
      id: overrides.guildId ?? 'guild-1',
      members: {
        fetch: vi.fn(async () => null),
        me: { permissions: { has: () => true } },
      },
    },
    channel: { id: overrides.channelId ?? 'channel-1' },
    content: overrides.content ?? null,
    author: {
      id: overrides.author?.id ?? 'user-1',
      username: overrides.author?.username ?? 'testuser',
      bot: overrides.author?.bot ?? false,
      send: vi.fn(async () => null),
    },
    attachments: attachmentMap,
    embeds: (overrides.embeds ?? []).map((embed) => ({
      fields: [],
      ...embed,
    })),
    components: overrides.components ?? [],
    webhookId: overrides.webhookId ?? null,
    member: overrides.member ?? null,
    deletable: overrides.deletable ?? true,
    delete: deleteFn,
  } as unknown as Message;
}

export function getMessageDeleteMock(message: Message) {
  return message.delete as ReturnType<typeof vi.fn>;
}
