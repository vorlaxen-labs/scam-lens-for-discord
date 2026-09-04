import { SlashCommandBuilder } from 'discord.js';
import { normalizeDomain } from '../services/domain-blocklist.service.js';
import type { BotCommand } from '../shared/types/index.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import { client } from '../infra/bot/client.js';

const RemoveDomainCommand: BotCommand = {
  name: 'remove-domain',
  description: 'Remove a guild-specific blocked domain',
  settings: { manageGuildRequired: true },
  data: new SlashCommandBuilder()
    .setName('remove-domain')
    .setDescription('Remove a guild-specific blocked domain')
    .addStringOption((option) =>
      option.setName('domain').setDescription('Domain to remove').setRequired(true),
    ),
  async execute(interaction) {
    const domain = normalizeDomain(interaction.options.getString('domain', true));
    const removed = client.services!.domainBlocklistService.removeGuildDomain(
      interaction.guildId!,
      domain,
    );

    await interaction.reply({
      embeds: [
        EmbedBuilder.success(removed ? 'Domain removed' : 'Domain not found', domain),
      ],
      ephemeral: true,
    });
  },
};

export default RemoveDomainCommand;
