import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type Client,
  PermissionFlagsBits,
  type TextChannel,
} from 'discord.js';
import { ulid } from 'ulid';
import { brandingConfig, scamConfig } from '../config/index.js';
import { DetectionLogRepository } from '../infra/database/repositories/detection-log.repository.js';
import { getDb } from '../infra/database/connection.js';
import { EmbedBuilder } from '../shared/embed/embed.builder.js';
import type {
  AboutEmbedContext,
  DetectionContext,
  DetectionEmbedContext,
  DetectionTechnicalContext,
  DetectionType,
} from '../shared/types/index.js';
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
    const targets = this.resolveLogTargets(context.guildId);
    if (targets.length === 0) return;

    const guildName = await this.resolveGuildName(context.guildId);

    const simpleContext: DetectionEmbedContext = {
      operationId: context.operationId,
      userId: context.userId,
      username: context.username,
      mention: `<@${context.userId}>`,
      type: context.detectionType,
      match: context.matchedValue,
      action: context.actionTaken,
      distance: context.hammingDistance ?? undefined,
      guildName,
    };

    const technicalContext: DetectionTechnicalContext = {
      ...simpleContext,
      guildId: context.guildId,
      messageId: context.messageId,
      channelId: context.channelId,
      actionResult: context.actionResult,
      actionMode: context.actionMode,
      phashThreshold: context.phashThreshold,
      phashStrictThreshold: context.phashStrictThreshold,
      domainMatches: context.domainMatches,
      imageMatches: context.imageMatches,
      metadataJson: context.metadataJson,
    };

    for (const target of targets) {
      const embed = target.technical
        ? EmbedBuilder.detectionTechnical(technicalContext)
        : EmbedBuilder.detection(simpleContext);
      await this.sendEmbedToChannel(target.channelId, embed, context.guildId);
    }
  }

  private resolveLogTargets(guildId: string): Array<{ channelId: string; technical: boolean }> {
    const targets: Array<{ channelId: string; technical: boolean }> = [];

    const row = getDb()
      .prepare('SELECT log_channel_id FROM guild_settings WHERE guild_id = ?')
      .get(guildId) as { log_channel_id: string | null } | undefined;

    const guildLogId = row?.log_channel_id ?? null;
    const centralLogId = scamConfig.centralLogChannelId;

    if (guildLogId && guildLogId !== centralLogId) {
      targets.push({ channelId: guildLogId, technical: false });
    }

    if (centralLogId) {
      targets.push({ channelId: centralLogId, technical: true });
    } else if (guildLogId) {
      targets.push({ channelId: guildLogId, technical: false });
    }

    return targets;
  }

  private async sendEmbedToChannel(
    channelId: string,
    embed: ReturnType<typeof EmbedBuilder.detection>,
    sourceGuildId: string,
  ): Promise<void> {
    const channel = await this.client.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      logger.warn({ channelId, guildId: sourceGuildId }, 'Log channel unavailable');
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

    await textChannel.send({ embeds: [embed] });
  }

  private async resolveGuildName(guildId: string): Promise<string | undefined> {
    const guild = await this.client.guilds.fetch(guildId).catch(() => null);
    return guild?.name;
  }

  buildAboutEmbed(context: AboutEmbedContext) {
    const embed = EmbedBuilder.about(context);
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setLabel('GitHub')
        .setStyle(ButtonStyle.Link)
        .setURL(brandingConfig.githubUrl),
      new ButtonBuilder()
        .setLabel('Setup Guide')
        .setStyle(ButtonStyle.Link)
        .setURL(brandingConfig.docsUrl),
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
