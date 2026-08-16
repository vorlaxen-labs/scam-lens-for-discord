import { Events } from 'discord.js';
import type { BotEvent } from '../shared/types/index.js';
import { client } from '../infra/bot/client.js';
import { collectMessageImageUrls } from '../shared/utils/message-image.util.js';
import { logger } from '../infra/logger/index.js';

const MessageCreateEvent: BotEvent<typeof Events.MessageCreate> = {
  name: Events.MessageCreate,
  async execute(message) {
    const services = client.services;
    if (!services || !message.guildId || !message.guild) return;

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

    if (!services.messageDedupRepository.tryClaim(message.id)) return;

    const domainMatches = services.domainBlocklistService.scanMessage(message, message.guildId);

    const imageMatches = [];
    const imageUrls = collectMessageImageUrls(message);

    for (const imageUrl of imageUrls) {
      const match = await services.phashService.scanUrl(
        imageUrl,
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
