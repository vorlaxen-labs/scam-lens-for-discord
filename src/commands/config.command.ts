import {
  ChannelType,
  SlashCommandBuilder,
} from 'discord.js';
import type { ActionMode, BotCommand, DomainMatch } from '../shared/types/index.js';
import { formatActionMode } from '../shared/utils/action-mode.util.js';
import { brandingConfig, scamConfig } from '../config/index.js';
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
            .setDescription('0=ban, 1=delete+log, 2=log only, 3=timeout, 4=ban+timeout')
            .setMinValue(0)
            .setMaxValue(4)
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('timeout-duration')
        .setDescription('Set high-confidence timeout duration (seconds)')
        .addIntegerOption((option) =>
          option
            .setName('seconds')
            .setDescription('Timeout duration in seconds (60-604800)')
            .setMinValue(60)
            .setMaxValue(604_800)
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
        .setName('skip-bots')
        .setDescription('Skip scanning messages from bots')
        .addBooleanOption((option) =>
          option.setName('value').setDescription('Skip bots').setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('quarantine')
        .setDescription('Configure fuzzy pHash quarantine (timeout)')
        .addBooleanOption((option) =>
          option.setName('enabled').setDescription('Enable fuzzy quarantine'),
        )
        .addIntegerOption((option) =>
          option
            .setName('duration')
            .setDescription('Quarantine duration in seconds (60-604800)')
            .setMinValue(60)
            .setMaxValue(604_800),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('restore')
        .setDescription('Restore a user after a false positive (unban + remove timeout)')
        .addUserOption((option) =>
          option.setName('user').setDescription('User to restore').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('operation_id').setDescription('Optional detection operation ID (SL-...)'),
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
        embeds: [EmbedBuilder.config('Action mode', formatActionMode(mode))],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'timeout-duration') {
      const seconds = interaction.options.getInteger('seconds', true);
      const previous = settings.timeoutDurationSeconds;
      settings.timeoutDurationSeconds = seconds;
      services.guildSettingsService.update(settings);
      await interaction.reply({
        embeds: [EmbedBuilder.config('Timeout duration', `${previous}s → ${seconds}s`)],
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

    if (subcommand === 'skip-bots') {
      const value = interaction.options.getBoolean('value', true);
      settings.skipBots = value;
      services.guildSettingsService.update(settings);
      await interaction.reply({
        embeds: [EmbedBuilder.config('Skip bots', value ? 'On' : 'Off')],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'quarantine') {
      const enabled = interaction.options.getBoolean('enabled');
      const duration = interaction.options.getInteger('duration');
      const changes: string[] = [];

      if (enabled !== null) {
        settings.quarantineFuzzyImages = enabled;
        changes.push(`Enabled: ${enabled ? 'yes' : 'no'}`);
      }
      if (duration !== null) {
        settings.quarantineDurationSeconds = duration;
        changes.push(`Duration: ${duration}s`);
      }

      if (changes.length === 0) {
        await interaction.reply({
          embeds: [
            EmbedBuilder.config(
              'Quarantine',
              [
                `Enabled: ${settings.quarantineFuzzyImages ? 'yes' : 'no'}`,
                `Duration: ${settings.quarantineDurationSeconds}s`,
              ].join('\n'),
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      services.guildSettingsService.update(settings);
      await interaction.reply({
        embeds: [EmbedBuilder.config('Quarantine', changes.join('\n'))],
        ephemeral: true,
      });
      return;
    }

    if (subcommand === 'restore') {
      const user = interaction.options.getUser('user', true);
      const operationId = interaction.options.getString('operation_id');
      const guild = interaction.guild!;

      if (operationId) {
        const record = services.detectionLogService.findByOperationId(operationId);
        if (!record || record.guildId !== guildId) {
          await interaction.reply({
            embeds: [EmbedBuilder.config('Restore failed', 'Operation ID not found for this server.')],
            ephemeral: true,
          });
          return;
        }
        if (record.userId !== user.id) {
          await interaction.reply({
            embeds: [EmbedBuilder.config('Restore failed', 'Operation ID does not match the selected user.')],
            ephemeral: true,
          });
          return;
        }
      }

      const results: string[] = [];
      try {
        await guild.members.unban(user.id, 'Scam Lens: false positive restore');
        results.push('Unban attempted');
      } catch {
        results.push('Unban skipped (not banned or missing permission)');
      }

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (member?.moderatable && member.communicationDisabledUntil) {
        try {
          await member.timeout(null, 'Scam Lens: false positive restore');
          results.push('Timeout cleared');
        } catch {
          results.push('Timeout clear failed');
        }
      } else {
        results.push('Timeout clear skipped');
      }

      if (operationId) {
        const marked = services.detectionLogService.markRestored(operationId, interaction.user.id);
        results.push(marked ? 'Detection log marked restored' : 'Detection log already restored');
      }

      await interaction.reply({
        embeds: [
          EmbedBuilder.success(
            'User restored',
            [`User: ${user.tag}`, ...results].join('\n'),
          ),
        ],
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
    const allowlistCount = services.domainBlocklistService.countGuildAllowedDomains(guildId);
    const guildBlocklistCount = services.domainBlocklistService.listGuildDomains(guildId).length;

    await interaction.reply({
      embeds: [
        EmbedBuilder.config(
          'Settings',
          [
            `Threshold: ${settings.phashThreshold}`,
            `Strict: ${settings.phashStrictThreshold}`,
            `Action: ${formatActionMode(settings.actionMode)}`,
            `Timeout (high confidence): ${settings.timeoutDurationSeconds}s`,
            `Enabled: ${settings.enabled ? 'yes' : 'no'}`,
            `Skip bots: ${settings.skipBots ? 'yes' : 'no'}`,
            `Quarantine fuzzy: ${settings.quarantineFuzzyImages ? 'yes' : 'no'} (${settings.quarantineDurationSeconds}s)`,
            `Guild blocklist: ${guildBlocklistCount} custom domains`,
            `Allowlist: ${allowlistCount} domains`,
            `Guild log: ${guildLog}`,
            `Central log: ${centralLog}`,
            `Global seed source: [SOURCES.md](${brandingConfig.githubUrl}/blob/main/data/text/SOURCES.md)`,
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
