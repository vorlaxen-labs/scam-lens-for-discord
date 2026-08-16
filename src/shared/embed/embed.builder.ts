import { EmbedBuilder as DiscordEmbedBuilder, type APIEmbed } from 'discord.js';
import { brandingConfig } from '../../config/index.js';
import type {
  AboutEmbedContext,
  DetectionEmbedContext,
  DetectionTechnicalContext,
  DetectionType,
  DomainMatch,
  ImageMatch,
} from '../types/index.js';
import { formatActionMode } from '../utils/action-mode.util.js';

const COLORS = {
  danger: 0xed4245,
  success: 0x57f287,
  neutral: 0x5865f2,
  technical: 0xb91c1c,
} as const;

function formatDetectionType(type: DetectionType): string {
  switch (type) {
    case 'image':
      return 'Image';
    case 'domain':
      return 'Domain';
    case 'dual':
      return 'Image + Domain';
  }
}

function formatAction(action: string): string {
  const labels: Record<string, string> = {
    log: 'Log only',
    delete: 'Message deleted',
    ban: 'User banned',
    ban_partial: 'Ban failed (partial)',
    timeout: 'User timed out',
    timeout_partial: 'Timeout failed (partial)',
    'ban+timeout': 'User banned and timed out',
    'ban+timeout_partial': 'User banned, timeout failed (partial)',
    'ban_partial+timeout': 'Ban failed, user timed out (partial)',
    quarantine: 'User quarantined (timeout)',
  };
  return labels[action] ?? action;
}

function formatMatch(type: DetectionType, match: string, distance?: number): string {
  const isHash = type === 'image' || (type === 'dual' && match.includes('hash:'));
  const matchLine = isHash && !match.includes(' ')
    ? `\`${match.length > 20 ? `${match.slice(0, 16)}…` : match}\``
    : `\`${match}\``;

  if (distance !== undefined) {
    const confidence = distance === 0 ? 'Exact match' : `Similar (distance ${distance})`;
    return `${matchLine}\n${confidence}`;
  }

  return matchLine;
}

function formatImageTechnicalBlock(image: ImageMatch, threshold: number, strict: number): string {
  const referenceName = image.label ?? 'Unlabeled reference';
  const lines = [
    `**Reference:** ${referenceName}`,
    `**DB source:** ${image.hashSource}`,
    `**Input pHash:** \`${image.hash}\``,
    `**Reference pHash:** \`${image.matchedHash}\``,
    `**Hamming distance:** ${image.hammingDistance} (threshold ${threshold}, strict ${strict})`,
    `**Score:** ${image.hammingDistance === 0 ? '100% exact' : `${Math.max(0, 100 - image.hammingDistance * 6)}% similar`}`,
  ];
  return lines.join('\n');
}

function formatDomainTechnicalBlock(match: DomainMatch): string {
  return [
    `**Hostname:** \`${match.domain}\``,
    `**Blocklist entry:** \`${match.blockedDomain}\``,
    `**List source:** ${match.source}`,
  ].join('\n');
}

function parseMetadataPreview(metadataJson: string): string {
  try {
    const data = JSON.parse(metadataJson) as {
      contentPreview?: string | null;
      attachments?: Array<{ url: string; name: string | null }>;
    };
    const parts: string[] = [];
    if (data.contentPreview) {
      parts.push(`**Content:** ${data.contentPreview.slice(0, 200)}`);
    }
    if (data.attachments?.length) {
      const urls = data.attachments
        .map((attachment) => attachment.name ?? attachment.url)
        .slice(0, 3)
        .join('\n');
      parts.push(`**Attachments:**\n${urls}`);
    }
    const embedImages = (data as { embedImages?: string[] }).embedImages;
    if (embedImages?.length) {
      parts.push(`**Embed images:**\n${embedImages.slice(0, 3).join('\n')}`);
    }
    return parts.length > 0 ? parts.join('\n') : 'No message snapshot';
  } catch {
    return 'Metadata unavailable';
  }
}

export class EmbedBuilder {
  static detection(context: DetectionEmbedContext): APIEmbed {
    return new DiscordEmbedBuilder()
      .setTitle('Scam Detected')
      .setDescription(`Operation \`${context.operationId}\``)
      .setColor(COLORS.danger)
      .addFields(
        {
          name: 'User',
          value: `${context.mention}\n${context.username} · \`${context.userId}\``,
          inline: true,
        },
        {
          name: 'Server',
          value: context.guildName ?? 'Unknown',
          inline: true,
        },
        {
          name: 'Action',
          value: formatAction(context.action),
          inline: true,
        },
        {
          name: formatDetectionType(context.type),
          value: [
            formatMatch(context.type, context.match, context.distance),
            context.trustScore !== undefined ? `Trust score: **${context.trustScore}/100**` : null,
          ]
            .filter(Boolean)
            .join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: brandingConfig.footerText })
      .toJSON();
  }

  static detectionTechnical(context: DetectionTechnicalContext): APIEmbed {
    const builder = new DiscordEmbedBuilder()
      .setTitle('Scam Detected · Technical Report')
      .setDescription(`Operation \`${context.operationId}\``)
      .setColor(COLORS.technical)
      .addFields(
        {
          name: 'User',
          value: `${context.mention}\n${context.username}\n\`${context.userId}\``,
          inline: true,
        },
        {
          name: 'Server',
          value: `${context.guildName ?? 'Unknown'}\n\`${context.guildId}\``,
          inline: true,
        },
        {
          name: 'Action',
          value: [
            formatAction(context.action),
            `Mode: ${formatActionMode(context.actionMode)}`,
            `Result: ${context.actionResult}`,
            `Trust score: ${context.trustScore}/100`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Message',
          value: `Message: \`${context.messageId}\`\nChannel: <#${context.channelId}>`,
          inline: false,
        },
      );

    if (context.imageMatches.length > 0) {
      builder.addFields({
        name: 'pHash Analysis',
        value: formatImageTechnicalBlock(
          context.imageMatches[0]!,
          context.phashThreshold,
          context.phashStrictThreshold,
        ),
        inline: false,
      });
    }

    if (context.domainMatches.length > 0) {
      builder.addFields({
        name: 'Domain Blocklist',
        value: context.domainMatches.map(formatDomainTechnicalBlock).join('\n\n'),
        inline: false,
      });
    }

    builder.addFields({
      name: 'Evidence Snapshot',
      value: parseMetadataPreview(context.metadataJson),
      inline: false,
    });

    builder.setFooter({ text: `${context.operationId} · ${brandingConfig.footerText}` });

    return builder.toJSON();
  }

  static about(context: AboutEmbedContext): APIEmbed {
    const builder = new DiscordEmbedBuilder()
      .setTitle(brandingConfig.projectName)
      .setURL(brandingConfig.githubUrl)
      .setAuthor({ name: brandingConfig.author, url: brandingConfig.authorUrl })
      .setDescription(
        [
          'Open-source Discord protection against **scam images** and **malicious domains**.',
          'Every message is scanned for known scam visuals (pHash) and blocklisted URLs, then your server\'s action mode is applied.',
          'Auto-ban only triggers on high-confidence signals — guild domain, strict pHash, or dual detection.',
          'Global seed domain alone deletes + logs. Fuzzy pHash may trigger quarantine (timeout).',
        ].join('\n\n'),
      )
      .setColor(COLORS.neutral)
      .addFields(
        {
          name: 'Detection',
          value: [
            '**Image** — 64-bit perceptual hash vs reference database; fuzzy match within threshold',
            '**Domain** — suffix match against global blocklist + per-server entries',
            '**Dual** — image + domain together = highest confidence',
          ].join('\n'),
          inline: false,
        },
        {
          name: 'Action Modes',
          value: [
            '`0` Delete + auto-ban (high confidence)',
            '`1` Delete + log *(default)*',
            '`2` Log only *(new servers)*',
            '`3` Delete + timeout (high confidence)',
            '`4` Delete + ban + timeout (high confidence)',
            'Logging is always recorded. Modes combine delete, ban, and timeout.',
            'Configure with `/config action` · timeout length via `/config timeout-duration`',
          ].join('\n'),
          inline: false,
        },
        {
          name: 'Database',
          value: [
            `Global domains: **${context.globalDomainCount.toLocaleString()}**`,
            `Reference hashes: **${context.globalHashCount.toLocaleString()}**`,
            `Servers: **${context.guildCount.toLocaleString()}**`,
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Stack',
          value: [
            'Node 20+ · discord.js v14',
            'SQLite · sharp · imghash',
            'MIT license',
          ].join('\n'),
          inline: true,
        },
        {
          name: 'Commands',
          value: [
            '`/about` · `/get-hash` · `/add-scam` · `/remove-scam`',
            '`/add-domain` · `/remove-domain` · `/list-domains`',
            '`/add-allow-domain` · `/remove-allow-domain` · `/list-allow-domains`',
            '`/config` — log channel, thresholds, action, quarantine, restore, status',
          ].join('\n'),
          inline: false,
        },
      )
      .setFooter({ text: `v${context.version} · MIT · ${brandingConfig.footerText}` });

    if (context.guild) {
      const guild = context.guild;
      const logChannel = guild.logChannelId ? `<#${guild.logChannelId}>` : 'Not set';
      builder.addFields({
        name: 'This Server',
        value: [
          `Status: **${guild.enabled ? 'Enabled' : 'Disabled'}**`,
          `Action: **${formatActionMode(guild.actionMode)}**`,
          `pHash: threshold **${guild.phashThreshold}**, strict **${guild.phashStrictThreshold}**`,
          `Custom domains: **${guild.customDomainCount}** · Guild hashes: **${guild.guildHashCount}**`,
          `Log channel: ${logChannel}`,
        ].join('\n'),
        inline: false,
      });
    }

    return builder.toJSON();
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
