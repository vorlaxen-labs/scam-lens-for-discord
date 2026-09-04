import {
  PermissionFlagsBits,
  type Client,
  type TextChannel,
} from 'discord.js';
import { scamConfig, telemetryConfig } from '../config/index.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import type { TelemetryEvent, TelemetryGuildSummary } from '../shared/types/index.js';
import { logger } from '../infra/logger/index.js';

const EVENT_TITLES: Record<TelemetryEvent, string> = {
  bot_ready: 'Bot ready',
  guild_join: 'Bot joined server',
  guild_leave: 'Bot left server',
  command_used: 'Command used',
  command_denied: 'Command denied',
  command_error: 'Command failed',
};

export class TelemetryService {
  constructor(private readonly client: Client) {}

  async emit(event: TelemetryEvent, data: Record<string, unknown>): Promise<void> {
    logger.info({ event, telemetry: true, ...data }, `[telemetry] ${event}`);

    if (!this.shouldNotifyChannel(event)) return;

    const fields = this.buildFields(event, data);
    const embed = EmbedBuilder.telemetry({
      event,
      title: EVENT_TITLES[event],
      fields,
    });

    await this.sendCentralEmbed(embed);
  }

  private shouldNotifyChannel(event: TelemetryEvent): boolean {
    if (!telemetryConfig.enabled || !scamConfig.centralLogChannelId) return false;

    if (event === 'bot_ready' || event === 'guild_join' || event === 'guild_leave') {
      return telemetryConfig.guildEvents;
    }

    return telemetryConfig.commands;
  }

  private buildFields(
    event: TelemetryEvent,
    data: Record<string, unknown>,
  ): Array<{ name: string; value: string; inline?: boolean }> {
    switch (event) {
      case 'bot_ready':
        return this.buildBotReadyFields(data);
      case 'guild_join':
      case 'guild_leave':
        return this.buildGuildLifecycleFields(data);
      case 'command_used':
      case 'command_denied':
      case 'command_error':
        return this.buildCommandFields(data);
    }
  }

  private buildBotReadyFields(data: Record<string, unknown>) {
    const guilds = (data.guilds as TelemetryGuildSummary[] | undefined) ?? [];
    const guildLines =
      guilds.length === 0
        ? 'None'
        : guilds
            .slice(0, 15)
            .map((guild) => `**${guild.name}** (\`${guild.id}\`) · ${guild.memberCount ?? '?'} members`)
            .join('\n');

    const extraGuilds = guilds.length > 15 ? `\n…and ${guilds.length - 15} more` : '';

    return [
      { name: 'Guilds', value: String(data.guildCount ?? guilds.length), inline: true },
      { name: 'Domains', value: String(data.domains ?? '?'), inline: true },
      { name: 'Reference hashes', value: String(data.referenceImageHashes ?? '?'), inline: true },
      { name: 'Servers', value: `${guildLines}${extraGuilds}`, inline: false },
    ];
  }

  private buildGuildLifecycleFields(data: Record<string, unknown>) {
    const fields = [
      {
        name: 'Server',
        value: `**${String(data.guildName ?? 'Unknown')}** (\`${String(data.guildId ?? '?')}\`)`,
        inline: false,
      },
      {
        name: 'Members',
        value: String(data.memberCount ?? '?'),
        inline: true,
      },
    ];

    if (data.ownerTag) {
      fields.push({
        name: 'Owner',
        value: `<@${String(data.ownerId)}> (${String(data.ownerTag)})`,
        inline: true,
      });
    }

    if (data.addedByTag) {
      fields.push({
        name: 'Added by',
        value: `<@${String(data.addedById)}> (${String(data.addedByTag)})`,
        inline: true,
      });
    } else if (data.removedByTag) {
      fields.push({
        name: 'Removed by',
        value: `<@${String(data.removedById)}> (${String(data.removedByTag)})`,
        inline: true,
      });
    }

    if (data.reason) {
      fields.push({
        name: 'Reason',
        value: String(data.reason),
        inline: false,
      });
    }

    return fields;
  }

  private buildCommandFields(data: Record<string, unknown>) {
    const fields = [
      {
        name: 'Command',
        value: `\`/${String(data.command ?? '?')}\``,
        inline: true,
      },
      {
        name: 'User',
        value: `<@${String(data.userId)}> (${String(data.username ?? '?')})`,
        inline: true,
      },
    ];

    if (data.guildId) {
      fields.push({
        name: 'Server',
        value: data.guildName
          ? `**${String(data.guildName)}** (\`${String(data.guildId)}\`)`
          : `\`${String(data.guildId)}\``,
        inline: false,
      });
    }

    if (data.reason) {
      fields.push({
        name: 'Reason',
        value: String(data.reason),
        inline: false,
      });
    }

    if (data.errorMessage) {
      fields.push({
        name: 'Error',
        value: String(data.errorMessage).slice(0, 900),
        inline: false,
      });
    }

    return fields;
  }

  private async sendCentralEmbed(
    embed: ReturnType<typeof EmbedBuilder.telemetry>,
  ): Promise<void> {
    const channelId = scamConfig.centralLogChannelId;
    if (!channelId) return;

    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      logger.warn({ channelId }, 'Telemetry log channel unavailable');
      return;
    }

    const textChannel = channel as TextChannel;
    const permissions = textChannel.permissionsFor(this.client.user!.id);
    if (
      !permissions?.has(PermissionFlagsBits.SendMessages) ||
      !permissions.has(PermissionFlagsBits.EmbedLinks)
    ) {
      logger.warn({ channelId }, 'Missing permissions for telemetry log channel');
      return;
    }

    await textChannel.send({ embeds: [embed] });
  }
}
