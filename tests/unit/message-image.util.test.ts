import { describe, expect, it } from 'vitest';
import { collectMessageImageUrls } from '../../src/shared/utils/message-image.util.js';

function createMessage(partial: {
  attachments?: Array<{ url: string; contentType: string | null; name?: string | null }>;
  embeds?: Array<{ image?: { url: string }; thumbnail?: { url: string } }>;
}) {
  return {
    attachments: new Map(
      (partial.attachments ?? []).map((attachment, index) => [
        String(index),
        attachment,
      ]),
    ),
    embeds: partial.embeds ?? [],
  } as never;
}

describe('collectMessageImageUrls', () => {
  it('collects attachment and embed image urls', () => {
    const urls = collectMessageImageUrls(
      createMessage({
        attachments: [
          {
            url: 'https://cdn.discordapp.com/attachments/1/2/a.png',
            contentType: 'image/png',
          },
        ],
        embeds: [
          {
            image: {
              url: 'https://media.discordapp.net/attachments/1/3/b.webp',
            },
            thumbnail: {
              url: 'https://images-ext-1.discordapp.net/external/abc/thumb.png',
            },
          },
        ],
      }),
    );

    expect(urls).toEqual([
      'https://cdn.discordapp.com/attachments/1/2/a.png',
      'https://media.discordapp.net/attachments/1/3/b.webp',
      'https://images-ext-1.discordapp.net/external/abc/thumb.png',
    ]);
  });

  it('collects image attachments without content type when extension matches', () => {
    const urls = collectMessageImageUrls(
      createMessage({
        attachments: [
          {
            url: 'https://cdn.discordapp.com/attachments/1/2/scam.webp',
            contentType: null,
            name: 'scam.webp',
          },
        ],
      }),
    );

    expect(urls).toEqual(['https://cdn.discordapp.com/attachments/1/2/scam.webp']);
  });

  it('dedupes urls and skips non-discord hosts', () => {
    const shared = 'https://cdn.discordapp.com/attachments/1/2/a.png';
    const urls = collectMessageImageUrls(
      createMessage({
        attachments: [{ url: shared, contentType: 'image/png' }],
        embeds: [{ image: { url: shared }, thumbnail: { url: 'https://evil.com/x.png' } }],
      }),
    );

    expect(urls).toEqual([shared]);
  });

  it('respects maxImagesPerMessage limit', () => {
    const urls = collectMessageImageUrls(
      createMessage({
        attachments: [
          { url: 'https://cdn.discordapp.com/attachments/1/1.png', contentType: 'image/png' },
          { url: 'https://cdn.discordapp.com/attachments/1/2.png', contentType: 'image/png' },
          { url: 'https://cdn.discordapp.com/attachments/1/3.png', contentType: 'image/png' },
          { url: 'https://cdn.discordapp.com/attachments/1/4.png', contentType: 'image/png' },
        ],
        embeds: [{ image: { url: 'https://cdn.discordapp.com/attachments/1/5.png' } }],
      }),
    );

    expect(urls).toHaveLength(3);
  });
});
