import {
  PermissionFlagsBits,
  type Message,
  type TextChannel,
} from 'discord.js';
import type { GuildSettingsService } from './guild-settings.service.js';
import type { DetectionLogService } from './detection-log.service.js';
import {
  buildDetectionType,
  buildMatchedValue,
  buildMetadataSnapshot,
} from './detection-log.service.js';
import type { DomainMatch, GuildSettings, ImageMatch } from '../shared/types/index.js';
import { logger } from '../infra/logger/index.js';

const COMPROMISED_ACCOUNT_DM =
  'Your account may have shared scam content. If you did not send this message, your account may have been compromised. Please secure your account.';

export interface MessageScanMatches {
  domainMatches: DomainMatch[];
  imageMatches: ImageMatch[];
}

export class ScamDetectionService {
  private readonly processedMessages = new Map<string, number>();
  private readonly dedupTtlMs = 60_000;

  constructor(
    private readonly guildSettingsService: GuildSettingsService,
    private readonly detectionLogService: DetectionLogService,
  ) {}

  shouldAutoBan(
    settings: GuildSettings,
    domainMatches: DomainMatch[],
    imageMatches: ImageMatch[],
  ): boolean {
    if (domainMatches.length > 0) return true;

    const strictMatch = imageMatches.some(
      (match) => match.hammingDistance <= settings.phashStrictThreshold,
    );
    if (strictMatch) return true;

    if (domainMatches.length > 0 && imageMatches.length > 0) return true;

    return false;
  }

  isDuplicate(messageId: string): boolean {
    this.cleanupDedupCache();
    return this.processedMessages.has(messageId);
  }

  markProcessed(messageId: string): void {
    this.processedMessages.set(messageId, Date.now());
  }

  private cleanupDedupCache(): void {
    const now = Date.now();
    for (const [messageId, timestamp] of this.processedMessages) {
      if (now - timestamp > this.dedupTtlMs) {
        this.processedMessages.delete(messageId);
      }
    }
  }

  async handleDetection(message: Message, matches: MessageScanMatches): Promise<void> {
    if (!message.guildId || !message.guild) return;
    if (this.isDuplicate(message.id)) return;
    this.markProcessed(message.id);

    const settings = this.guildSettingsService.getOrCreate(message.guildId);
    if (!settings.enabled) return;

    const { domainMatches, imageMatches } = matches;
    if (domainMatches.length === 0 && imageMatches.length === 0) return;

    const detectionType = buildDetectionType(domainMatches.length > 0, imageMatches.length > 0);
    const matchedValue = buildMatchedValue(domainMatches, imageMatches);
    const hammingDistance = imageMatches[0]?.hammingDistance ?? null;
    const metadataJson = buildMetadataSnapshot({
      id: message.id,
      channelId: message.channel.id,
      content: message.content,
      attachments: [...message.attachments.values()].map((attachment) => ({
        url: attachment.url,
        name: attachment.name,
      })),
      embeds: message.embeds.map((embed) => ({
        url: embed.url ?? null,
        title: embed.title ?? null,
      })),
    });

    const operationId = this.detectionLogService.createOperationId();
    const autoBanEligible = this.shouldAutoBan(settings, domainMatches, imageMatches);

    const actionResults: string[] = [];
    let actionTaken = 'log';

    if (settings.actionMode !== 2) {
      const deleted = await this.tryDeleteMessage(message);
      actionResults.push(deleted ? 'delete:success' : 'delete:failed');
      if (deleted) actionTaken = 'delete';
    }

    const shouldModerate =
      autoBanEligible && (settings.actionMode === 0 || settings.actionMode === 3);

    if (shouldModerate) {
      await this.sendWarningDm(message);
      if (settings.actionMode === 0) {
        const banned = await this.tryBanMember(message);
        actionResults.push(banned ? 'ban:success' : 'ban:failed');
        actionTaken = banned ? 'ban' : 'ban_partial';
      } else if (settings.actionMode === 3) {
        const timedOut = await this.tryTimeoutMember(message, settings.timeoutDurationSeconds);
        actionResults.push(timedOut ? 'timeout:success' : 'timeout:failed');
        actionTaken = timedOut ? 'timeout' : 'timeout_partial';
      }
    }

    await this.detectionLogService.record({
      operationId,
      guildId: message.guildId,
      userId: message.author.id,
      username: message.author.username,
      messageId: message.id,
      channelId: message.channel.id,
      detectionType,
      matchedValue,
      hammingDistance,
      actionTaken,
      actionResult: actionResults.length > 0 ? actionResults.join(',') : 'log_only',
      metadataJson,
    });
  }

  private async tryDeleteMessage(message: Message): Promise<boolean> {
    try {
      if (!message.deletable) {
        logger.warn({ messageId: message.id }, 'Message not deletable');
        return false;
      }
      await message.delete();
      return true;
    } catch (error) {
      logger.warn({ error, messageId: message.id }, 'Failed to delete scam message');
      return false;
    }
  }

  private async sendWarningDm(message: Message): Promise<void> {
    try {
      await message.author.send(COMPROMISED_ACCOUNT_DM);
    } catch {
      logger.debug({ userId: message.author.id }, 'Could not DM user about scam detection');
    }
  }

  private async tryBanMember(message: Message): Promise<boolean> {
    const member = message.member ?? (await message.guild!.members.fetch(message.author.id).catch(() => null));
    if (!member) return false;

    const channel = message.channel as TextChannel;
    const botMember = channel.guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.BanMembers)) {
      return false;
    }
    if (!member.bannable) return false;

    try {
      await member.ban({ reason: 'Scam Lens: high-confidence scam content detected' });
      return true;
    } catch (error) {
      logger.warn({ error, userId: member.id }, 'Ban failed');
      return false;
    }
  }

  private async tryTimeoutMember(message: Message, durationSeconds: number): Promise<boolean> {
    const member =
      message.member ?? (await message.guild!.members.fetch(message.author.id).catch(() => null));
    if (!member) return false;

    const botMember = member.guild.members.me;
    if (!botMember?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      return false;
    }
    if (!member.moderatable) return false;

    try {
      await member.timeout(durationSeconds * 1000, 'Scam Lens: high-confidence scam content detected');
      return true;
    } catch (error) {
      logger.warn({ error, userId: member.id }, 'Timeout failed');
      return false;
    }
  }
}
