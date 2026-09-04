import { Events } from 'discord.js';
import type { BotEvent } from '../shared/types/index.js';
import { PermissionGuard } from '../shared/guards/permission.guard.js';
import { client } from '../infra/bot/client.js';
import { logger } from '../infra/logger/index.js';

const InteractionCreateEvent: BotEvent<typeof Events.InteractionCreate> = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    const services = client.services;
    if (!services) {
      await interaction.reply({ content: 'Bot is still starting up.', ephemeral: true });
      return;
    }

    const guardResult = await PermissionGuard.check(interaction, command);
    if (!guardResult.allowed) {
      await services.telemetryService.emit('command_denied', {
        command: command.name,
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name ?? null,
        reason: guardResult.reason,
      });
      return;
    }

    const cooldownSeconds = command.settings?.cooldownSeconds ?? 0;
    if (cooldownSeconds > 0) {
      const remaining = services.cooldownService.check(
        interaction.user.id,
        command.name,
        cooldownSeconds,
      );
      if (remaining !== null) {
        await interaction.reply({
          content: `Please wait ${remaining}s before using this command again.`,
          ephemeral: true,
        });
        return;
      }
    }

    try {
      await command.execute(interaction);
      await services.telemetryService.emit('command_used', {
        command: command.name,
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name ?? null,
      });
    } catch (error) {
      logger.error(
        { error, command: command.name, userId: interaction.user.id },
        'Command execution failed',
      );

      await services.telemetryService.emit('command_error', {
        command: command.name,
        userId: interaction.user.id,
        username: interaction.user.username,
        guildId: interaction.guildId,
        guildName: interaction.guild?.name ?? null,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      const reply = {
        content: 'Something went wrong while running that command.',
        ephemeral: true,
      };

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(reply);
      } else {
        await interaction.reply(reply);
      }
    }
  },
};

export default InteractionCreateEvent;
