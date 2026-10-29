import { vi, type Mock } from 'vitest';
import type { Message } from 'discord.js';
import { createMockMessage } from '../helpers/mock-message.js';
import type { MemberCapability } from './types.js';

export type PreparedMessage = {
  message: Message;
  deleteMock: Mock;
  banMock: Mock;
  timeoutMock: Mock;
  dmMock: Mock;
};

export function buildDetectionMessage(input: {
  id?: string;
  content?: string | null;
  deletable?: boolean;
  deleteRejects?: boolean;
  dmRejects?: boolean;
  missingGuild?: boolean;
  member?: MemberCapability;
}): PreparedMessage {
  const capability = input.member ?? 'full';
  const banMock = vi.fn(async () => undefined);
  const timeoutMock = vi.fn(async () => undefined);
  const canModerate = capability === 'full' || capability === 'unbannable';
  const permissions = { has: () => canModerate };
  const member =
    capability === 'missing'
      ? null
      : {
          id: 'user-1',
          bannable: capability === 'full',
          moderatable: capability === 'full',
          ban: banMock,
          timeout: timeoutMock,
          roles: {
            cache: {
              some: () => false,
            },
          },
          guild: { members: { me: { permissions } } },
        };

  const guild = input.missingGuild
    ? null
    : {
        id: 'guild-1',
        members: {
          fetch: vi.fn(async () => member),
          me: { permissions },
        },
      };

  const message = createMockMessage({
    id: input.id ?? 'msg-scenario',
    content: input.content ?? 'https://login.evil.com',
    deletable: input.deletable ?? true,
    guild: (guild ?? undefined) as never,
    member: member as never,
  });

  if (input.missingGuild) {
    Object.assign(message, { guild: null, guildId: null });
  } else {
    Object.assign(message.channel, { guild });
  }

  const deleteMock = message.delete as Mock;
  if (input.deleteRejects) {
    deleteMock.mockRejectedValueOnce(new Error('missing access'));
  }

  const dmMock = message.author.send as Mock;
  if (input.dmRejects) {
    dmMock.mockRejectedValueOnce(new Error('cannot send messages to this user'));
  }

  return { message, deleteMock, banMock, timeoutMock, dmMock };
}
