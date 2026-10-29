import type { HammingScenario, ScoreScenario } from '../types.js';
import { globalDomain, guildDomain, imageMatch } from './fixtures.js';

function score(
  name: string,
  patch: Omit<ScoreScenario, 'kind' | 'name'>,
): ScoreScenario {
  return { kind: 'score', name, ...patch };
}

function bits(
  name: string,
  left: string,
  right: string,
  expect: HammingScenario['expect'],
): HammingScenario {
  return { kind: 'hamming', name, left, right, expect };
}

export const POLICY_SCENARIOS: Array<ScoreScenario | HammingScenario> = [
  score('no signals score zero and do not ban', {
    domainMatches: [],
    imageMatches: [],
    strictThreshold: 3,
    expect: { trustScore: 0, autoBan: false },
  }),
  score('global domain alone scores 60 and does not ban', {
    domainMatches: [globalDomain()],
    imageMatches: [],
    strictThreshold: 3,
    expect: { trustScore: 60, autoBan: false },
  }),
  score('guild domain alone scores 90 and can ban', {
    domainMatches: [guildDomain()],
    imageMatches: [],
    strictThreshold: 3,
    expect: { trustScore: 90, autoBan: true },
  }),
  score('exact image hash scores 100 and can ban', {
    domainMatches: [],
    imageMatches: [imageMatch(0)],
    strictThreshold: 3,
    expect: { trustScore: 100, autoBan: true },
  }),
  score('strict image distance 1 scores 93', {
    domainMatches: [],
    imageMatches: [imageMatch(1)],
    strictThreshold: 3,
    expect: { trustScore: 93, autoBan: true },
  }),
  score('strict image distance 2 scores 91', {
    domainMatches: [],
    imageMatches: [imageMatch(2)],
    strictThreshold: 3,
    expect: { trustScore: 91, autoBan: true },
  }),
  score('image on the strict boundary scores 89 and can ban', {
    domainMatches: [],
    imageMatches: [imageMatch(3)],
    strictThreshold: 3,
    expect: { trustScore: 89, autoBan: true },
  }),
  score('image one step past strict does not ban', {
    domainMatches: [],
    imageMatches: [imageMatch(4)],
    strictThreshold: 3,
    expect: { trustScore: 68, autoBan: false },
  }),
  score('fuzzy image distance 5 scores 60', {
    domainMatches: [],
    imageMatches: [imageMatch(5)],
    strictThreshold: 3,
    expect: { trustScore: 60, autoBan: false },
  }),
  score('fuzzy image distance 7 scores 44', {
    domainMatches: [],
    imageMatches: [imageMatch(7)],
    strictThreshold: 3,
    expect: { trustScore: 44, autoBan: false },
  }),
  score('very fuzzy image distance is floored at 40', {
    domainMatches: [],
    imageMatches: [imageMatch(8)],
    strictThreshold: 3,
    expect: { trustScore: 40, autoBan: false },
  }),
  score('domain plus image scores 95 even when the hash is exact', {
    domainMatches: [globalDomain()],
    imageMatches: [imageMatch(0)],
    strictThreshold: 3,
    expect: { trustScore: 95, autoBan: true },
  }),
  score('domain plus a fuzzy image is still a ban-eligible dual hit', {
    domainMatches: [globalDomain()],
    imageMatches: [imageMatch(8)],
    strictThreshold: 3,
    expect: { trustScore: 95, autoBan: true },
  }),
  score('guild domain plus an image uses the dual score', {
    domainMatches: [guildDomain()],
    imageMatches: [imageMatch(4)],
    strictThreshold: 3,
    expect: { trustScore: 95, autoBan: true },
  }),
  score('raising the strict threshold promotes a distance-4 image to a ban', {
    domainMatches: [],
    imageMatches: [imageMatch(4)],
    strictThreshold: 4,
    expect: { trustScore: 87, autoBan: true },
  }),
  score('timeout applies only when it is enabled and a ban is not happening', {
    domainMatches: [globalDomain()],
    imageMatches: [],
    strictThreshold: 3,
    timeoutEnabled: true,
    willBan: false,
    expect: { trustScore: 60, autoBan: false, applyTimeout: true },
  }),
  score('timeout does not apply together with a ban', {
    domainMatches: [guildDomain()],
    imageMatches: [],
    strictThreshold: 3,
    timeoutEnabled: true,
    willBan: true,
    expect: { trustScore: 90, autoBan: true, applyTimeout: false },
  }),
  score('timeout stays off when the setting is disabled', {
    domainMatches: [globalDomain()],
    imageMatches: [],
    strictThreshold: 3,
    timeoutEnabled: false,
    willBan: false,
    expect: { trustScore: 60, autoBan: false, applyTimeout: false },
  }),
  bits('identical hashes have distance 0', 'a1b2c3d4', 'a1b2c3d4', { distance: 0 }),
  bits('hex case does not change the distance', 'AAAA', 'aaaa', { distance: 0 }),
  bits('one flipped bit has distance 1', '00000000', '00000001', { distance: 1 }),
  bits('opposite nibbles are four bits each', '0000', 'ffff', { distance: 16 }),
  bits('different lengths are rejected', '0000', '00000', { error: 'Hash lengths must match' }),
  bits('non-hex characters are rejected', '0000', 'gggg', { error: 'Invalid hex hash character' }),
];
