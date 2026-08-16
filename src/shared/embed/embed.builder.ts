import { EmbedBuilder as DiscordEmbedBuilder, type APIEmbed } from 'discord.js';
import { brandingConfig } from '../../config/index.js';
import type { DetectionEmbedContext } from '../types/index.js';

const COLORS = {
  danger: 0xed4245,
  success: 0x57f287,
  neutral: 0x5865f2,
} as const;

export class EmbedBuilder {
  static detection(context: DetectionEmbedContext): APIEmbed {
    const detailParts = [context.type, context.match, context.action];
    if (context.distance !== undefined) {
      detailParts.splice(2, 0, `distance ${context.distance}`);
    }

    return new DiscordEmbedBuilder()
      .setTitle(context.operationId)
      .setColor(COLORS.danger)
      .addFields(
        { name: 'User', value: `${context.mention} · ${context.username} · ${context.userId}` },
        { name: 'Detail', value: detailParts.join(' · ') },
      )
      .setFooter({ text: brandingConfig.footerText })
      .toJSON();
  }

  static about(): APIEmbed {
    return new DiscordEmbedBuilder()
      .setTitle(brandingConfig.projectName)
      .setDescription('Scam image and domain protection. Open source.')
      .setColor(COLORS.neutral)
      .setFooter({ text: brandingConfig.copyright })
      .toJSON();
  }

  static success(title: string, value: string): APIEmbed {
    return new DiscordEmbedBuilder()
      .setTitle(title)
      .setDescription(value)
      .setColor(COLORS.success)
      .toJSON();
  }

  static config(title: string, description: string): APIEmbed {
    return new DiscordEmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(COLORS.neutral)
      .toJSON();
  }
}
