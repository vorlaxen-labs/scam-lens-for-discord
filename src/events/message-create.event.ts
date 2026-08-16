import { Events } from 'discord.js';
import type { BotEvent } from '../shared/types/index.js';
import { client } from '../infra/bot/client.js';
import { IMAGE_FETCH_LIMITS } from '../shared/utils/image-fetch.util.js';
import { logger } from '../infra/logger/index.js';

const MessageCreateEvent: BotEvent<typeof Events.MessageCreate> = {
  name: Events.MessageCreate,
  async execute(message) {
    const services = client.services;
    if (!services || !message.guildId || !message.guild) return;

    if (message.author.bot) return;

    const settings = services.guildSettingsService.getOrCreate(message.guildId);
    if (!settings.enabled) return;

    if (settings.skipBots && message.author.bot) return;
    if (settings.skipWebhooks && message.webhookId) return;

    if (message.member) {
      const hasExemptRole = message.member.roles.cache.some((role) =>
        settings.exemptRoleIds.includes(role.id),
      );
      if (hasExemptRole) return;
    }

    if (services.scamDetectionService.isDuplicate(message.id)) return;

    const domainMatches = services.domainBlocklistService.scanMessage(message, message.guildId);

    const imageMatches = [];
    const imageAttachments = [...message.attachments.values()]
      .filter((attachment) => attachment.contentType?.startsWith('image/'))
      .slice(0, IMAGE_FETCH_LIMITS.maxImagesPerMessage);

    for (const attachment of imageAttachments) {
      const match = await services.phashService.scanUrl(
        attachment.url,
        settings.phashThreshold,
        message.guildId,
      );
      if (match) {
        imageMatches.push(match);
        break;
      }
    }

    if (domainMatches.length === 0 && imageMatches.length === 0) return;

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
