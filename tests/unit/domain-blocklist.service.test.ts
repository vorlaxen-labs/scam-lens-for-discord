import { describe, expect, it } from 'vitest';
import {
  extractHostname,
  isDomainBlocked,
  normalizeDomain,
} from '../../src/services/domain-blocklist.service.js';

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
});
