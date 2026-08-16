import {
  ChannelType,
  SlashCommandBuilder,
} from 'discord.js';
import type { ActionMode, BotCommand, DomainMatch } from '../shared/types/index.js';
import { scamConfig } from '../config/index.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import { client } from '../infra/bot/client.js';

const ConfigCommand: BotCommand = {
  name: 'config',
  description: 'Configure Scam Lens for this server',
  settings: { manageGuildRequired: true },
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure Scam Lens for this server')
    .addSubcommand((sub) =>
      sub
        .setName('log-channel')
        .setDescription('Set the detection log channel')
        .addChannelOption((option) =>
          option
            .setName('channel')
            .setDescription('Log channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('threshold')
        .setDescription('Set pHash delete+log threshold (1-20)')
        .addIntegerOption((option) =>
          option.setName('value').setDescription('Threshold').setMinValue(1).setMaxValue(20).setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('strict-threshold')
        .setDescription('Set pHash auto-ban threshold (1-10)')
        .addIntegerOption((option) =>
          option.setName('value').setDescription('Strict threshold').setMinValue(1).setMaxValue(10).setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('action')
        .setDescription('Set action mode')
        .addIntegerOption((option) =>
          option
            .setName('mode')
            .setDescription('0=ban, 1=delete+log, 2=log only, 3=timeout')
            .setMinValue(0)
            .setMaxValue(3)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('enabled')
        .setDescription('Enable or disable scam detection')
        .addBooleanOption((option) =>
          option.setName('value').setDescription('Enabled').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('test')
        .setDescription('Dry-run scan text without taking action')
        .addStringOption((option) =>
          option.setName('text').setDescription('Text or URL to scan').setRequired(true),
        ),
    )
    .addSubcommand((sub) => sub.setName('status').setDescription('Show current settings')),
  async execute(interaction) {
    const services = client.services!;
    const guildId = interaction.guildId!;
    const settings = services.guildSettingsService.getOrCreate(guildId);
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === 'log-channel') {
      const channel = interaction.options.getChannel('channel', true);
      settings.logChannelId = channel.id;
      services.guildSettingsService.update(settings);
      await interaction.reply({
        embeds: [EmbedBuilder.success('Log channel', `<#${channel.id}>`)],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'threshold') {
      const value = interaction.options.getInteger('value', true);
      const previous = settings.phashThreshold;
      settings.phashThreshold = value;
      services.guildSettingsService.update(settings);
      await interaction.reply({
        embeds: [EmbedBuilder.config('Threshold', `${previous} → ${value}`)],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'strict-threshold') {
      const value = interaction.options.getInteger('value', true);
      const previous = settings.phashStrictThreshold;
      settings.phashStrictThreshold = value;
      services.guildSettingsService.update(settings);
      await interaction.reply({
        embeds: [EmbedBuilder.config('Strict threshold', `${previous} → ${value}`)],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'action') {
      const mode = interaction.options.getInteger('mode', true) as ActionMode;
      settings.actionMode = mode;
      services.guildSettingsService.update(settings);
      await interaction.reply({
        embeds: [EmbedBuilder.config('Action mode', `Mode ${mode}`)],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'enabled') {
      const value = interaction.options.getBoolean('value', true);
      settings.enabled = value;
      services.guildSettingsService.update(settings);
      await interaction.reply({
        embeds: [EmbedBuilder.config('Enabled', value ? 'On' : 'Off')],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'test') {
      const text = interaction.options.getString('text', true);
      const matches = services.domainBlocklistService.dryRun(text, guildId);
      if (matches.length === 0) {
        await interaction.reply({
          embeds: [EmbedBuilder.config('Dry-run', 'No blocked domains detected.')],
          ephemeral: true,
        });
        return;
      }

      const lines = matches.map((match) => formatDryRunMatch(match));
      await interaction.reply({
        embeds: [EmbedBuilder.config('Dry-run matches', lines.join('\n'))],
        ephemeral: true,
      });
      return;
    }

    const guildLog = settings.logChannelId ? `<#${settings.logChannelId}>` : 'not set (use /config log-channel)';
    const centralLog = scamConfig.centralLogChannelId
      ? `<#${scamConfig.centralLogChannelId}> (all guilds)`
      : 'not configured';
    await interaction.reply({
      embeds: [
        EmbedBuilder.config(
          'Settings',
          [
            `Threshold: ${settings.phashThreshold}`,
            `Strict: ${settings.phashStrictThreshold}`,
            `Action: ${settings.actionMode}`,
            `Enabled: ${settings.enabled ? 'yes' : 'no'}`,
            `Guild log: ${guildLog}`,
            `Central log: ${centralLog}`,
          ].join('\n'),
        ),
      ],
      ephemeral: true,
    });
  },
};

export default ConfigCommand;

function formatDryRunMatch(match: DomainMatch): string {
  if (match.domain === match.blockedDomain) {
    return `${match.domain} (${match.source} blocklist)`;
  }
  return `${match.domain} → ${match.blockedDomain} (${match.source})`;
}
