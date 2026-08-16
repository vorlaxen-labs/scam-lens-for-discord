import type { DetectionType } from '../shared/types/index.js';

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
  embeds: { url: string | null; title: string | null; imageUrl?: string | null; thumbnailUrl?: string | null }[];
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
    embedImages: message.embeds.flatMap((embed) =>
      [embed.imageUrl, embed.thumbnailUrl].filter(Boolean),
    ),
    capturedAt: new Date().toISOString(),
  });
}
