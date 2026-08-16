import { SlashCommandBuilder } from 'discord.js';
import { normalizeDomain } from '../services/domain-blocklist.service.js';
import type { BotCommand } from '../shared/types/index.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import { client } from '../infra/bot/client.js';

const RemoveAllowDomainCommand: BotCommand = {
  name: 'remove-allow-domain',
  description: 'Remove a domain from this server allowlist',
  settings: { manageGuildRequired: true },
  data: new SlashCommandBuilder()
    .setName('remove-allow-domain')
    .setDescription('Remove a domain from this server allowlist')
    .addStringOption((option) =>
      option.setName('domain').setDescription('Domain to remove').setRequired(true),
    ),
  async execute(interaction) {
    const domain = normalizeDomain(interaction.options.getString('domain', true));
    const removed = client.services!.domainBlocklistService.removeGuildAllowedDomain(
      interaction.guildId!,
      domain,
    );

    if (!removed) {
      await interaction.reply({
        embeds: [EmbedBuilder.config('Allowlist', `\`${domain}\` was not on the allowlist.`)],
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      embeds: [EmbedBuilder.success('Allowlist updated', `\`${domain}\` removed.`)],
      ephemeral: true,
    });
  },
};

export default RemoveAllowDomainCommand;
