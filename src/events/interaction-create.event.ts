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

    const allowed = await PermissionGuard.check(interaction, command);
    if (!allowed) return;

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
    } catch (error) {
      logger.error(
        { error, command: command.name, userId: interaction.user.id },
        'Command execution failed',
      );

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
