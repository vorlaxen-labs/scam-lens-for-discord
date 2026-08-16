import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { PhashService, PHASH_SIZE } from '../../src/services/phash.service.js';
import { hammingDistance } from '../../src/shared/utils/hamming.util.js';

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

  it('matches resized variant within threshold', async () => {
    const sharp = (await import('sharp')).default;
    const resized = await sharp(sourceBuffer).resize(256, 256).webp().toBuffer();
    const originalHash = await phashService.computeHashFromBuffer(sourceBuffer);
    const resizedHash = await phashService.computeHashFromBuffer(resized);
    expect(hammingDistance(originalHash, resizedHash)).toBeLessThanOrEqual(8);
  });
});
