import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { botConfig } from '../../config/index.js';
import type { BotCommand, CommandSettings } from '../types/index.js';
import { logger } from '../../infra/logger/index.js';

export type PermissionDenyReason = 'guild_only' | 'owner_only' | 'manage_guild';

export type PermissionCheckResult =
  | { allowed: true }
  | { allowed: false; reason: PermissionDenyReason };

const DENY_MESSAGES: Record<PermissionDenyReason, string> = {
  guild_only: 'This command can only be used inside a server.',
  owner_only: 'This command is restricted to the bot owner.',
  manage_guild: 'You need Manage Server permission to use this command.',
};

export class PermissionGuard {
  static async check(
    interaction: ChatInputCommandInteraction,
    command: BotCommand,
  ): Promise<PermissionCheckResult> {
    const settings: CommandSettings = command.settings ?? {};

    if (settings.guildOnly !== false && !interaction.guildId) {
      await interaction.reply({
        content: DENY_MESSAGES.guild_only,
        ephemeral: true,
      });
      return { allowed: false, reason: 'guild_only' };
    }

    if (settings.ownerOnly) {
      const isOwner = botConfig.ownerIds.includes(interaction.user.id);
      if (!isOwner) {
        await interaction.reply({
          content: DENY_MESSAGES.owner_only,
          ephemeral: true,
        });
        return { allowed: false, reason: 'owner_only' };
      }
    }

    if (settings.manageGuildRequired) {
      const member = interaction.member;
      const permissions = member?.permissions;
      const hasManageGuild =
        permissions &&
        typeof permissions !== 'string' &&
        permissions.has(PermissionFlagsBits.ManageGuild);

      const administratorFallback = settings.administratorFallback !== false;
      const hasAdministrator =
        administratorFallback &&
        permissions &&
        typeof permissions !== 'string' &&
        permissions.has(PermissionFlagsBits.Administrator);

      if (!hasManageGuild && !hasAdministrator) {
        logger.warn(
          {
            userId: interaction.user.id,
            guildId: interaction.guildId,
            command: command.name,
          },
          'Permission denied for command',
        );
        await interaction.reply({
          content: DENY_MESSAGES.manage_guild,
          ephemeral: true,
        });
        return { allowed: false, reason: 'manage_guild' };
      }
    }

    return { allowed: true };
  }
}
