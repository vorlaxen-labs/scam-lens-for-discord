import { SlashCommandBuilder } from 'discord.js';
import type { BotCommand } from '../shared/types/index.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import { client } from '../infra/bot/client.js';

const ListAllowDomainsCommand: BotCommand = {
  name: 'list-allow-domains',
  description: 'List domains allowed to bypass blocklist checks in this server',
  settings: { manageGuildRequired: true },
  data: new SlashCommandBuilder()
    .setName('list-allow-domains')
    .setDescription('List domains allowed to bypass blocklist checks in this server'),
  async execute(interaction) {
    const domains = client.services!.domainBlocklistService.listGuildAllowedDomains(
      interaction.guildId!,
    );
    if (domains.length === 0) {
      await interaction.reply({
        embeds: [
          EmbedBuilder.config(
            'Allowlist',
            'No allowlisted domains. Use `/add-allow-domain` to exempt trusted domains from false positives.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const pageSize = 40;
    const page = domains.slice(0, pageSize);
    const suffix = domains.length > pageSize ? `\n…and ${domains.length - pageSize} more` : '';

    await interaction.reply({
      embeds: [EmbedBuilder.config('Allowlist', page.join('\n') + suffix)],
      ephemeral: true,
    });
  },
};

export default ListAllowDomainsCommand;
