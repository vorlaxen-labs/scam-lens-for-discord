import { Events } from 'discord.js';
import type { BotEvent } from '../shared/types/index.js';
import { client } from '../infra/bot/client.js';
import { collectMessageImageUrls } from '../shared/utils/message-image.util.js';
import { logger } from '../infra/logger/index.js';

const MessageCreateEvent: BotEvent<typeof Events.MessageCreate> = {
  name: Events.MessageCreate,
  async execute(rawMessage) {
    const services = client.services;
    if (!services || !rawMessage.guildId || !rawMessage.guild) return;

    let message = rawMessage;
    if (message.partial) {
      try {
        message = await message.fetch();
      } catch (error) {
        logger.warn({ error, messageId: message.id }, 'Failed to fetch partial message');
        return;
      }
    }

    const guildId = message.guildId;
    if (!guildId || !message.guild) return;

    const settings = services.guildSettingsService.getOrCreate(guildId);
    if (!settings.enabled) return;

    if (settings.skipBots && message.author.bot) return;
    if (settings.skipWebhooks && message.webhookId) return;

    if (message.member) {
      const hasExemptRole = message.member.roles.cache.some((role) =>
        settings.exemptRoleIds.includes(role.id),
      );
      if (hasExemptRole) return;
    }

    if (!services.messageDedupRepository.tryClaim(message.id)) return;

    const domainMatches = services.domainBlocklistService.scanMessage(message, guildId);

    const imageUrls = collectMessageImageUrls(message);
    const imageMatches = [];

    if (imageUrls.length > 0) {
      logger.debug(
        {
          messageId: message.id,
          channelId: message.channel.id,
          imageCount: imageUrls.length,
          referenceHashCount: services.phashService.getHashCounts().global,
        },
        'Scanning message images',
      );
    }

    for (const imageUrl of imageUrls) {
      const match = await services.phashService.scanUrl(
        imageUrl,
        settings.phashThreshold,
        guildId,
      );
      if (match) {
        imageMatches.push(match);
        break;
      }
    }

    if (domainMatches.length === 0 && imageMatches.length === 0) {
      if (imageUrls.length > 0) {
        logger.debug(
          { messageId: message.id, imageCount: imageUrls.length },
          'No scam image match above threshold',
        );
      }
      return;
    }

    try {
      await services.scamDetectionService.handleDetection(message, {
        domainMatches,
        imageMatches,
      });
    } catch (error) {
      logger.error({ error, messageId: message.id }, 'Scam detection failed');
    }
  },
};

export default MessageCreateEvent;
