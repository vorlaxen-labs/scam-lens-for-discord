import { SlashCommandBuilder } from 'discord.js';
import { normalizeDomain } from '../services/domain-blocklist.service.js';
import type { BotCommand } from '../shared/types/index.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import { client } from '../infra/bot/client.js';

const AddDomainCommand: BotCommand = {
  name: 'add-domain',
  description: 'Add a blocked domain for this server',
  settings: { manageGuildRequired: true },
  data: new SlashCommandBuilder()
    .setName('add-domain')
    .setDescription('Add a blocked domain for this server')
    .addStringOption((option) =>
      option.setName('domain').setDescription('Domain to block').setRequired(true),
    ),
  async execute(interaction) {
    const domain = normalizeDomain(interaction.options.getString('domain', true));
    if (!domain.includes('.')) {
      await interaction.reply({ content: 'Invalid domain.', ephemeral: true });
      return;
    }

    client.services!.domainBlocklistService.addGuildDomain(
      interaction.guildId!,
      domain,
      interaction.user.id,
    );

    await interaction.reply({
      embeds: [EmbedBuilder.success('Domain added', domain)],
      ephemeral: true,
    });
  },
};

export default AddDomainCommand;
