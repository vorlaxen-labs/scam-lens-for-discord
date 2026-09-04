import { beforeAll, describe, expect, it } from 'vitest';
import { PhashService } from '../../src/services/phash.service.js';

describe('PhashService.matchHash', () => {
  const service = new PhashService();

  beforeAll(() => {
    service.setHashRecords([
      {
        id: 1,
        guildId: null,
        hash: 'aaaaaaaaaaaaaaaa',
        label: 'global.webp',
        source: 'seed',
      },
      {
        id: 2,
        guildId: 'guild-1',
        hash: 'bbbbbbbbbbbbbbbb',
        label: 'guild.webp',
        source: 'command',
      },
      {
        id: 3,
        guildId: 'guild-2',
        hash: 'cccccccccccccccc',
        label: 'other-guild.webp',
        source: 'command',
      },
    ]);
  });

  it('returns best global match within threshold', () => {
    const match = service.matchHash('aaaaaaaaaaaaaaab', 8, 'guild-1');
    expect(match).toMatchObject({
      matchedHash: 'aaaaaaaaaaaaaaaa',
      hammingDistance: 1,
      label: 'global.webp',
      hashSource: 'seed',
    });
  });

  it('includes guild-specific hashes for matching guild', () => {
    const match = service.matchHash('bbbbbbbbbbbbbbbb', 0, 'guild-1');
    expect(match?.label).toBe('guild.webp');
  });

  it('excludes other guild hashes', () => {
    const match = service.matchHash('cccccccccccccccc', 0, 'guild-1');
    expect(match).toBeNull();
  });

  it('returns null when distance exceeds threshold', () => {
    const match = service.matchHash('ffffffffffffffff', 2, 'guild-1');
    expect(match).toBeNull();
  });
});
