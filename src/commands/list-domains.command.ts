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
    const records = client.services!.domainBlocklistService.listGuildDomainRecords(
      interaction.guildId!,
    );
    if (records.length === 0) {
      await interaction.reply({
        embeds: [
          EmbedBuilder.config(
            'Guild blocklist',
            'No guild-specific domains configured. Global seed blocklist still applies (~21k domains). See `data/text/SOURCES.md` in the repo for provenance.',
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const pageSize = 30;
    const page = records.slice(0, pageSize);
    const lines = page.map((record) => {
      const addedBy = record.addedBy ? `<@${record.addedBy}>` : 'unknown';
      return `\`${record.domain}\` · source: ${record.source} · by ${addedBy}`;
    });
    const suffix = records.length > pageSize ? `\n…and ${records.length - pageSize} more` : '';

    await interaction.reply({
      embeds: [EmbedBuilder.config('Guild blocklist', lines.join('\n') + suffix)],
      ephemeral: true,
    });
  },
};

export default ListDomainsCommand;
