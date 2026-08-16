import { SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../shared/types/index.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import { client } from '../infra/bot/client.js';

const ListDomainsCommand: BotCommand = {
  name: 'list-domains',
  description: 'List guild-specific blocked domains',
  settings: { manageGuildRequired: true },
  data: new SlashCommandBuilder()
    .setName('list-domains')
    .setDescription('List guild-specific blocked domains'),
  async execute(interaction) {
    const domains = client.services!.domainBlocklistService.listGuildDomains(interaction.guildId!);
    if (domains.length === 0) {
      await interaction.reply({
        embeds: [EmbedBuilder.config('Guild domains', 'No guild-specific domains configured.')],
        ephemeral: true,
      });
      return;
    }

    const pageSize = 40;
    const page = domains.slice(0, pageSize);
    const suffix = domains.length > pageSize ? `\n…and ${domains.length - pageSize} more` : '';

    await interaction.reply({
      embeds: [EmbedBuilder.config('Guild domains', page.join('\n') + suffix)],
      ephemeral: true,
    });
  },
};

export default ListDomainsCommand;
