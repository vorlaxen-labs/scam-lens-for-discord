import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  buildDetectionType,
  buildMatchedValue,
  buildMetadataSnapshot,
} from '../../src/services/detection-log.service.js';

describe('detection-log helpers', () => {
  it('builds detection types', () => {
    expect(buildDetectionType(true, true)).toBe('dual');
    expect(buildDetectionType(true, false)).toBe('domain');
    expect(buildDetectionType(false, true)).toBe('image');
  });

  it('builds matched values', () => {
    expect(
      buildMatchedValue(
        [{ domain: 'login.evil.com', blockedDomain: 'evil.com' }],
        [{ matchedHash: 'abcdef0123456789', hammingDistance: 0 }],
      ),
    ).toBe('evil.com + hash:abcdef01…');
    expect(
      buildMatchedValue([{ domain: 'login.evil.com', blockedDomain: 'evil.com' }], []),
    ).toBe('evil.com');
    expect(
      buildMatchedValue([], [{ matchedHash: 'abcdef0123456789', hammingDistance: 2 }]),
    ).toBe('abcdef0123456789');
  });

  it('builds metadata snapshot with embed images', () => {
    const snapshot = JSON.parse(
      buildMetadataSnapshot({
        id: 'm1',
        channelId: 'c1',
        content: 'visit https://evil.com',
        attachments: [{ url: 'https://cdn.discordapp.com/a.png', name: 'a.png' }],
        embeds: [
          {
            url: 'https://evil.com',
            title: 'Free Nitro',
            imageUrl: 'https://cdn.discordapp.com/embed.png',
            thumbnailUrl: null,
          },
        ],
      }),
    ) as {
      embedImages: string[];
      contentPreview: string;
    };

    expect(snapshot.contentPreview).toBe('visit https://evil.com');
    expect(snapshot.embedImages).toEqual(['https://cdn.discordapp.com/embed.png']);
  });
});
