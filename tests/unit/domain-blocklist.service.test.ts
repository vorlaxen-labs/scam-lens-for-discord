import { describe, expect, it } from 'vitest';
import {
  extractHostname,
  findBlockedSuffix,
  isAllowedDomain,
  isDomainBlocked,
  normalizeDomain,
} from '../../src/services/domain-blocklist.service.js';
import { isAllowedImageUrl } from '../../src/shared/utils/image-fetch.util.js';

describe('domain-blocklist matching', () => {
  it('normalizes domains', () => {
    expect(normalizeDomain('WWW.Example.COM,')).toBe('example.com');
  });

  it('matches suffix domains', () => {
    expect(isDomainBlocked('login.evil.com', 'evil.com')).toBe(true);
    expect(isDomainBlocked('evil.com', 'evil.com')).toBe(true);
  });

  it('does not match substring false positives', () => {
    expect(isDomainBlocked('notexample.com', 'example.com')).toBe(false);
  });

  it('extracts hostname from hxxps URLs', () => {
    expect(extractHostname('hxxps://101nitro.com/path')).toBe('101nitro.com');
    expect(extractHostname('https://101nitro.com')).toBe('101nitro.com');
  });

  it('finds blocked suffix via set lookup', () => {
    const blocked = new Set(['evil.com', 'discord-gift.com']);
    expect(findBlockedSuffix('login.evil.com', blocked)).toBe('evil.com');
    expect(findBlockedSuffix('safe.example.com', blocked)).toBeNull();
  });

  it('allows suffix matches via allowlist set', () => {
    const allowed = new Set(['trusted.com']);
    expect(isAllowedDomain('cdn.trusted.com', allowed)).toBe(true);
    expect(isAllowedDomain('evil.com', allowed)).toBe(false);
  });

  it('validates discord cdn image urls', () => {
    expect(isAllowedImageUrl('https://cdn.discordapp.com/attachments/1/2/a.png')).toBe(true);
    expect(isAllowedImageUrl('https://example.com/a.png')).toBe(false);
  });
});
