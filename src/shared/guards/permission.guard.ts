import {
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import { botConfig } from '../../config/index.js';
import type { BotCommand, CommandSettings } from '../types/index.js';
import { logger } from '../../infra/logger/index.js';

export class PermissionGuard {
  static async check(
    interaction: ChatInputCommandInteraction,
    command: BotCommand,
  ): Promise<boolean> {
    const settings: CommandSettings = command.settings ?? {};

    if (settings.guildOnly !== false && !interaction.guildId) {
      await interaction.reply({
        content: 'This command can only be used inside a server.',
        ephemeral: true,
      });
      return false;
    }

    if (settings.ownerOnly) {
      const isOwner = botConfig.ownerIds.includes(interaction.user.id);
      if (!isOwner) {
        await interaction.reply({
          content: 'This command is restricted to the bot owner.',
          ephemeral: true,
        });
        return false;
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
          content: 'You need Manage Server permission to use this command.',
          ephemeral: true,
        });
        return false;
      }
    }

    return true;
  }
}
