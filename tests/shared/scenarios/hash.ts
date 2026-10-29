import type { HashScenario } from '../types.js';

const GLOBAL = 'aaaaaaaaaaaaaaaa';
const GUILD = 'bbbbbbbbbbbbbbbb';
const OTHER = 'cccccccccccccccc';

function hash(
  name: string,
  patch: Omit<HashScenario, 'kind' | 'name'>,
): HashScenario {
  return { kind: 'hash', name, ...patch };
}

const library = [
  { hash: GLOBAL, guildId: null, label: 'global.webp', source: 'seed' },
  { hash: GUILD, guildId: 'guild-1', label: 'guild.webp', source: 'command' },
  { hash: OTHER, guildId: 'guild-2', label: 'other.webp', source: 'command' },
];

export const HASH_SCENARIOS: HashScenario[] = [
  hash('exact global hash matches at distance 0', {
    input: GLOBAL,
    threshold: 0,
    guildId: 'guild-1',
    records: library,
    expect: {
      match: { matchedHash: GLOBAL, hammingDistance: 0, hashSource: 'seed', label: 'global.webp' },
    },
  }),
  hash('one-bit drift still matches inside the threshold', {
    input: 'aaaaaaaaaaaaaaab',
    threshold: 8,
    guildId: 'guild-1',
    records: library,
    expect: { match: { matchedHash: GLOBAL, hammingDistance: 1, label: 'global.webp' } },
  }),
  hash('uppercase hex matches the stored lowercase hash', {
    input: 'AAAAAAAAAAAAAAAA',
    threshold: 0,
    guildId: 'guild-9',
    records: library,
    expect: { match: { matchedHash: GLOBAL, hammingDistance: 0, hashSource: 'seed' } },
  }),
  hash('distance equal to the threshold is a match', {
    input: '00000000000000ff',
    threshold: 8,
    guildId: 'guild-1',
    records: [{ hash: '0000000000000000', guildId: null, label: 'edge.webp', source: 'seed' }],
    expect: { match: { matchedHash: '0000000000000000', hammingDistance: 8 } },
  }),
  hash('distance past the threshold is not a match', {
    input: '00000000000000ff',
    threshold: 7,
    guildId: 'guild-1',
    records: [{ hash: '0000000000000000', guildId: null, label: 'edge.webp', source: 'seed' }],
    expect: { match: null },
  }),
  hash('guild hash is visible to that guild', {
    input: GUILD,
    threshold: 0,
    guildId: 'guild-1',
    records: library,
    expect: { match: { matchedHash: GUILD, hammingDistance: 0, label: 'guild.webp', hashSource: 'command' } },
  }),
  hash('another guild hash is hidden', {
    input: OTHER,
    threshold: 0,
    guildId: 'guild-1',
    records: library,
    expect: { match: null },
  }),
  hash('global hash is visible in a guild with no local hashes', {
    input: GLOBAL,
    threshold: 0,
    guildId: 'guild-9',
    records: library,
    expect: { match: { matchedHash: GLOBAL, hammingDistance: 0 } },
  }),
  hash('closer hash wins when several records are in range', {
    input: 'aaaaaaaaaaaaaaab',
    threshold: 8,
    guildId: 'guild-1',
    records: [
      { hash: GLOBAL, guildId: null, label: 'near.webp', source: 'seed' },
      { hash: 'aaaaaaaaaaaaaaa0', guildId: null, label: 'farther.webp', source: 'seed' },
    ],
    expect: { match: { matchedHash: GLOBAL, hammingDistance: 1, label: 'near.webp' } },
  }),
  hash('a broken hash record does not hide a valid one', {
    input: GLOBAL,
    threshold: 0,
    guildId: 'guild-1',
    records: [
      { hash: 'abcd', guildId: null, label: 'broken.webp', source: 'seed' },
      { hash: GLOBAL, guildId: null, label: 'global.webp', source: 'seed' },
    ],
    expect: { match: { matchedHash: GLOBAL, hammingDistance: 0, label: 'global.webp' } },
  }),
  hash('no reference hashes means no match', {
    input: GLOBAL,
    threshold: 8,
    guildId: 'guild-1',
    records: [],
    expect: { match: null },
  }),
  hash('empty input hash list means no match', {
    input: [],
    threshold: 8,
    guildId: 'guild-1',
    records: library,
    expect: { match: null },
  }),
];
