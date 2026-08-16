import { SlashCommandBuilder } from 'discord.js';
import { getDb } from '../infra/database/connection.js';
import { ScamHashRepository } from '../infra/database/repositories/scam-hash.repository.js';
import { refreshRuntimeCaches } from '../infra/bootstrap/create-services.js';
import type { BotCommand } from '../shared/types/index.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import { client } from '../infra/bot/client.js';
import { validateScamHash } from './get-hash.command.js';

const RemoveScamCommand: BotCommand = {
  name: 'remove-scam',
  description: 'Remove a guild-specific scam hash',
  settings: { manageGuildRequired: true },
  data: new SlashCommandBuilder()
    .setName('remove-scam')
    .setDescription('Remove a guild-specific scam hash')
    .addStringOption((option) =>
      option.setName('scam-hash').setDescription('Hash to remove').setRequired(true),
    ),
  async execute(interaction) {
    const hash = interaction.options.getString('scam-hash', true).toLowerCase();
    if (!validateScamHash(hash)) {
      await interaction.reply({ content: 'Invalid scam-hash format.', ephemeral: true });
      return;
    }

    const repo = new ScamHashRepository(getDb());
    const removed = repo.removeGuildHash(interaction.guildId!, hash);
    refreshRuntimeCaches(client.services!);

    await interaction.reply({
      embeds: [
        EmbedBuilder.success(
          removed ? 'Hash removed' : 'Hash not found',
          `\`${hash}\``,
        ),
      ],
      ephemeral: true,
    });
  },
};

export default RemoveScamCommand;
