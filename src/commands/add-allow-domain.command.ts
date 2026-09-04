import { SlashCommandBuilder } from 'discord.js';
import { normalizeDomain } from '../services/domain-blocklist.service.js';
import type { BotCommand } from '../shared/types/index.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import { client } from '../infra/bot/client.js';

const AddAllowDomainCommand: BotCommand = {
  name: 'add-allow-domain',
  description: 'Allow a domain to bypass blocklist checks in this server',
  settings: { manageGuildRequired: true },
  data: new SlashCommandBuilder()
    .setName('add-allow-domain')
    .setDescription('Allow a domain to bypass blocklist checks in this server')
    .addStringOption((option) =>
      option.setName('domain').setDescription('Domain to allow').setRequired(true),
    ),
  async execute(interaction) {
    const domain = normalizeDomain(interaction.options.getString('domain', true));
    if (!domain.includes('.')) {
      await interaction.reply({ content: 'Invalid domain.', ephemeral: true });
      return;
    }

    client.services!.domainBlocklistService.addGuildAllowedDomain(
      interaction.guildId!,
      domain,
      interaction.user.id,
    );

    await interaction.reply({
      embeds: [EmbedBuilder.success('Allowlist updated', `\`${domain}\` will bypass blocklist checks.`)],
      ephemeral: true,
    });
  },
};

export default AddAllowDomainCommand;
