import type { DomainMatch, ImageMatch } from '../../../src/shared/types/index.js';

export const DEFAULT_GLOBAL_DOMAINS = ['evil.com', 'discord-gift.com'];

export const SAMPLE_HASH = 'abcdef01abcdef01';

export function globalDomain(
  domain = 'login.evil.com',
  blockedDomain = 'evil.com',
): DomainMatch {
  return { domain, blockedDomain, source: 'global' };
}

export function guildDomain(
  domain = 'pay.custom-scam.net',
  blockedDomain = 'custom-scam.net',
): DomainMatch {
  return { domain, blockedDomain, source: 'guild' };
}

export function imageMatch(hammingDistance: number, matchedHash = SAMPLE_HASH): ImageMatch {
  return {
    hash: matchedHash,
    matchedHash,
    hammingDistance,
    label: 'seed.webp',
    hashSource: 'seed',
  };
}

export function cdnImage(name: string): string {
  return `https://cdn.discordapp.com/attachments/1/${name}`;
}
