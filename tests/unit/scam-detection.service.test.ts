import { describe, expect, it } from 'vitest';
import {
  computeTrustScore,
  shouldApplyTimeout,
  shouldAutoBan,
} from '../../src/services/scam-detection.service.js';

describe('ScamDetectionService moderation policy', () => {
  it('does not auto-ban on global domain match alone', () => {
    expect(
      shouldAutoBan(
        [{ domain: 'login.evil.com', blockedDomain: 'evil.com', source: 'global' }],
        [],
        3,
      ),
    ).toBe(false);
  });

  it('auto-bans on guild domain match', () => {
    expect(
      shouldAutoBan(
        [{ domain: 'login.evil.com', blockedDomain: 'evil.com', source: 'guild' }],
        [],
        3,
      ),
    ).toBe(true);
  });

  it('auto-bans on dual signal even with global domain', () => {
    expect(
      shouldAutoBan(
        [{ domain: 'login.evil.com', blockedDomain: 'evil.com', source: 'global' }],
        [{ hash: 'abc', matchedHash: 'abd', hammingDistance: 7, label: null, hashSource: 'seed' }],
        3,
      ),
    ).toBe(true);
  });

  it('auto-bans on strict pHash match', () => {
    expect(
      shouldAutoBan(
        [],
        [{ hash: 'abc', matchedHash: 'abd', hammingDistance: 2, label: null, hashSource: 'seed' }],
        3,
      ),
    ).toBe(true);
  });

  it('does not auto-ban on fuzzy pHash alone', () => {
    expect(
      shouldAutoBan(
        [],
        [{ hash: 'abc', matchedHash: 'xyz', hammingDistance: 7, label: null, hashSource: 'seed' }],
        3,
      ),
    ).toBe(false);
  });

  it('skips timeout when a ban will be issued', () => {
    expect(shouldApplyTimeout(true, true)).toBe(false);
  });

  it('computes trust scores by signal type', () => {
    expect(
      computeTrustScore(
        [{ domain: 'x.evil.com', blockedDomain: 'evil.com', source: 'global' }],
        [],
        3,
      ),
    ).toBe(60);
    expect(
      computeTrustScore(
        [{ domain: 'x.evil.com', blockedDomain: 'evil.com', source: 'guild' }],
        [],
        3,
      ),
    ).toBe(90);
    expect(
      computeTrustScore(
        [{ domain: 'x.evil.com', blockedDomain: 'evil.com', source: 'global' }],
        [{ hash: 'abc', matchedHash: 'abd', hammingDistance: 0, label: null, hashSource: 'seed' }],
        3,
      ),
    ).toBe(95);
  });
});
