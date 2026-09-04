import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PhashService,
  PHASH_SIZE,
  simulateDiscordUpload,
} from '../../src/services/phash.service.js';

describe('PhashService calibration', () => {
  const phashService = new PhashService();
  const imagePath = path.resolve('data/images/1.webp');
  const sourceBuffer = fs.readFileSync(imagePath);

  it('uses 64-bit hash output (16 hex chars)', async () => {
    expect(PHASH_SIZE).toBe(8);
    const hash = await phashService.computeHashFromBuffer(sourceBuffer);
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('is deterministic for the same buffer', async () => {
    const first = await phashService.computeHashFromBuffer(sourceBuffer);
    const second = await phashService.computeHashFromBuffer(sourceBuffer);
    expect(first).toBe(second);
  });

  it('returns deduplicated multi-scale hashes', async () => {
    const hashes = await phashService.computeMatchHashesFromBuffer(sourceBuffer);
    expect(hashes.length).toBeGreaterThan(0);
    expect(new Set(hashes).size).toBe(hashes.length);
    for (const hash of hashes) {
      expect(hash).toMatch(/^[0-9a-f]{16}$/);
    }
  });

  it('matches 720p Discord upload against 1080p reference variant', async () => {
    const ref1080 = await simulateDiscordUpload(sourceBuffer, 1920, 1080);
    const inc720 = await simulateDiscordUpload(sourceBuffer, 1280, 720);
    const refHash = await phashService.computeHashFromBuffer(ref1080);
    const incHashes = await phashService.computeMatchHashesFromBuffer(inc720);

    phashService.setHashRecords([
      {
        id: 1,
        guildId: null,
        hash: refHash,
        label: '1.webp@1080p',
        source: 'seed',
      },
    ]);

    expect(phashService.matchHash(incHashes, 8, 'guild-1')).not.toBeNull();
  });
});
