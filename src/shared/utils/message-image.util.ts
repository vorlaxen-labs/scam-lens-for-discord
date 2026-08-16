import type { Message } from 'discord.js';
import { IMAGE_FETCH_LIMITS, isAllowedImageUrl } from './image-fetch.util.js';

export function collectMessageImageUrls(message: Message): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  const add = (url: string | null | undefined): void => {
    if (!url || seen.has(url) || !isAllowedImageUrl(url)) return;
    if (urls.length >= IMAGE_FETCH_LIMITS.maxImagesPerMessage) return;
    seen.add(url);
    urls.push(url);
  };

  for (const attachment of message.attachments.values()) {
    if (attachment.contentType?.startsWith('image/')) {
      add(attachment.url);
    }
  }

  for (const embed of message.embeds) {
    add(embed.image?.url);
    add(embed.thumbnail?.url);
  }

  return urls;
}
