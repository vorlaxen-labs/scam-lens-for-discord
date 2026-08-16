import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  PermissionFlagsBits,
  type TextChannel,
} from 'discord.js';
import { ulid } from 'ulid';
import { brandingConfig } from '../config/index.js';
import { DetectionLogRepository } from '../infra/database/repositories/detection-log.repository.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import type { DetectionContext, DetectionEmbedContext, DetectionType } from '../shared/types/index.js';
import { logger } from '../infra/logger/index.js';

export class DetectionLogService {
  constructor(
    private readonly repository: DetectionLogRepository,
    private readonly client: Client,
  ) {}

  createOperationId(): string {
    return `SL-${ulid()}`;
  }

  async record(context: DetectionContext): Promise<string> {
    this.repository.insert(context);

    logger.warn(
      {
        operationId: context.operationId,
        event: 'scam_detected',
        guildId: context.guildId,
        userId: context.userId,
        username: context.username,
        type: context.detectionType,
        match: context.matchedValue,
        action: context.actionTaken,
        actionResult: context.actionResult,
      },
      `[${context.operationId}] scam_detected user=${context.username}(${context.userId}) guild=${context.guildId}`,
    );

    await this.sendDiscordLog(context);
    return context.operationId;
  }

  private async sendDiscordLog(context: DetectionContext): Promise<void> {
    const channelId = await this.resolveLogChannelId(context.guildId);
    if (!channelId) return;

    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      logger.warn({ channelId, guildId: context.guildId }, 'Log channel unavailable');
      return;
    }

    const textChannel = channel as TextChannel;
    const permissions = textChannel.permissionsFor(this.client.user!.id);
    if (
      !permissions?.has(PermissionFlagsBits.SendMessages) ||
      !permissions.has(PermissionFlagsBits.EmbedLinks)
    ) {
      logger.warn({ channelId }, 'Missing permissions for log channel');
      return;
    }

    const embedContext: DetectionEmbedContext = {
      operationId: context.operationId,
      userId: context.userId,
      username: context.username,
      mention: `<@${context.userId}>`,
      type: context.detectionType,
      match: context.matchedValue,
      action: context.actionTaken,
      distance: context.hammingDistance ?? undefined,
    };

    await textChannel.send({ embeds: [EmbedBuilder.detection(embedContext)] });
  }

  private async resolveLogChannelId(guildId: string): Promise<string | null> {
    const { getDb } = await import('../infra/database/connection.js');
    const row = getDb()
      .prepare('SELECT log_channel_id FROM guild_settings WHERE guild_id = ?')
      .get(guildId) as { log_channel_id: string | null } | undefined;
    return row?.log_channel_id ?? null;
  }

  buildAboutEmbed() {
    const embed = EmbedBuilder.about();
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('GitHub')
        .setStyle(ButtonStyle.Link)
        .setURL(brandingConfig.githubUrl),
      new ButtonBuilder()
        .setLabel('vorlaxen.com')
        .setStyle(ButtonStyle.Link)
        .setURL(brandingConfig.authorUrl),
    );
    return { embeds: [embed], components: [row] };
  }
}

export function buildDetectionType(
  hasDomain: boolean,
  hasImage: boolean,
): DetectionType {
  if (hasDomain && hasImage) return 'dual';
  if (hasDomain) return 'domain';
  return 'image';
}

export function buildMatchedValue(
  domainMatches: Array<{ domain: string; blockedDomain: string }>,
  imageMatches: Array<{ matchedHash: string; hammingDistance: number }>,
): string {
  if (domainMatches.length > 0 && imageMatches.length > 0) {
    return `${domainMatches[0]!.blockedDomain} + hash:${imageMatches[0]!.matchedHash.slice(0, 8)}…`;
  }
  if (domainMatches.length > 0) {
    return domainMatches[0]!.blockedDomain;
  }
  return imageMatches[0]!.matchedHash;
}

export function buildMetadataSnapshot(message: {
  id: string;
  channelId: string;
  content: string | null;
  attachments: { url: string; name: string | null }[];
  embeds: { url: string | null; title: string | null }[];
}): string {
  return JSON.stringify({
    messageId: message.id,
    channelId: message.channelId,
    contentPreview: message.content?.slice(0, 500) ?? null,
    attachments: message.attachments.map((attachment) => ({
      url: attachment.url,
      name: attachment.name,
    })),
    embedUrls: message.embeds.map((embed) => embed.url ?? embed.title).filter(Boolean),
    capturedAt: new Date().toISOString(),
  });
}
