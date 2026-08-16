import { describe, expect, it } from 'vitest';
import { hammingDistance, isValidHexHash } from '../../src/shared/utils/hamming.util.js';

describe('hamming.util', () => {
  it('returns 0 for identical hashes', () => {
    expect(hammingDistance('a1b2c3d4', 'a1b2c3d4')).toBe(0);
  });

  it('returns maximum distance for opposite nibbles', () => {
    expect(hammingDistance('0000', 'ffff')).toBe(16);
  });

  it('validates hex hash format', () => {
    expect(isValidHexHash('c4c786f8f0f0f0f0')).toBe(true);
    expect(isValidHexHash('xyz')).toBe(false);
  });
});
