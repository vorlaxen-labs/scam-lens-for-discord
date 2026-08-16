import { PermissionFlagsBits } from 'discord.js';
import { describe, expect, it, vi } from 'vitest';
import { PermissionGuard } from '../../src/shared/guards/permission.guard.js';
import type { BotCommand } from '../../src/shared/types/index.js';

function createInteraction(overrides: {
  guildId?: string | null;
  userId?: string;
  permissions?: bigint;
} = {}) {
  const reply = vi.fn(async () => undefined);
  return {
    guildId: overrides.guildId === undefined ? 'guild-1' : overrides.guildId,
    user: { id: overrides.userId ?? 'user-1' },
    member: {
      permissions: {
        has: (flag: bigint) => ((overrides.permissions ?? PermissionFlagsBits.ManageGuild) & flag) !== 0n,
      },
    },
    reply,
  } as never;
}

function createCommand(settings: BotCommand['settings'] = {}): BotCommand {
  return {
    name: 'test',
    description: 'test',
    settings,
    data: {} as never,
    execute: vi.fn(),
  };
}

describe('PermissionGuard', () => {
  it('rejects commands outside guild when guildOnly', async () => {
    const interaction = createInteraction({ guildId: null });
    const allowed = await PermissionGuard.check(interaction, createCommand({ guildOnly: true }));
    expect(allowed).toBe(false);
    expect(interaction.reply).toHaveBeenCalled();
  });

  it('requires manage guild for protected commands', async () => {
    const interaction = createInteraction({ permissions: 0n });
    const allowed = await PermissionGuard.check(
      interaction,
      createCommand({ manageGuildRequired: true }),
    );
    expect(allowed).toBe(false);
  });

  it('allows manage guild permission', async () => {
    const interaction = createInteraction({ permissions: PermissionFlagsBits.ManageGuild });
    const allowed = await PermissionGuard.check(
      interaction,
      createCommand({ manageGuildRequired: true }),
    );
    expect(allowed).toBe(true);
  });
});
