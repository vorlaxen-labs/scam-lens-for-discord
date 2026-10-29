import type {
  ActionMode,
  DetectionType,
  DomainMatch,
  ImageMatch,
} from '../../src/shared/types/index.js';

export type DomainMatchExpect = {
  domain: string;
  blockedDomain: string;
  source: 'global' | 'guild';
};

export type BlocklistSeed = {
  globalDomains?: string[];
  guildDomains?: string[];
  allowedDomains?: string[];
  /** Guild that owns guild and allowlist rows. */
  seedGuildId?: string;
  /** Guild the scan runs as. */
  guildId?: string;
};

export type DomainDryRunScenario = BlocklistSeed & {
  kind: 'domain-dry-run';
  name: string;
  text: string;
  expect: { matches: DomainMatchExpect[] };
};

export type DomainMessageScenario = BlocklistSeed & {
  kind: 'domain-message';
  name: string;
  content?: string | null;
  embeds?: Array<{
    url?: string | null;
    title?: string | null;
    description?: string | null;
    author?: { url?: string | null };
    fields?: Array<{ name: string; value: string }>;
  }>;
  components?: Array<{ components?: Array<{ url?: string }> }>;
  expect: { matches: DomainMatchExpect[] };
};

export type MemberCapability = 'full' | 'unbannable' | 'no-permissions' | 'missing';

export type DetectionExpect = {
  recorded: boolean;
  actionTaken?: string;
  actionResult?: string;
  detectionType?: DetectionType;
  trustScore?: number;
  matchedValue?: string;
  hammingDistance?: number | null;
  actionMode?: ActionMode;
  deleted?: boolean;
  deleteAttempted?: boolean;
  banned?: boolean;
  timedOut?: boolean;
  dmSent?: boolean;
  timeoutMs?: number;
};

export type DetectionScenario = {
  kind: 'detection';
  name: string;
  settings?: {
    actionMode?: ActionMode;
    enabled?: boolean;
    timeoutEnabled?: boolean;
    timeoutDurationSeconds?: number;
    phashStrictThreshold?: number;
    phashThreshold?: number;
  };
  content?: string | null;
  deletable?: boolean;
  deleteRejects?: boolean;
  dmRejects?: boolean;
  missingGuild?: boolean;
  member?: MemberCapability;
  domainMatches: DomainMatch[];
  imageMatches: ImageMatch[];
  expect: DetectionExpect;
};

export type ScoreScenario = {
  kind: 'score';
  name: string;
  domainMatches: DomainMatch[];
  imageMatches: ImageMatch[];
  strictThreshold: number;
  timeoutEnabled?: boolean;
  willBan?: boolean;
  expect: {
    trustScore: number;
    autoBan: boolean;
    applyTimeout?: boolean;
  };
};

export type HammingScenario = {
  kind: 'hamming';
  name: string;
  left: string;
  right: string;
  expect: { distance: number } | { error: string };
};

export type HashScenario = {
  kind: 'hash';
  name: string;
  input: string | readonly string[];
  threshold: number;
  guildId: string;
  records: Array<{
    hash: string;
    guildId: string | null;
    label: string | null;
    source: string;
  }>;
  expect: {
    match: {
      matchedHash: string;
      hammingDistance: number;
      hashSource?: string;
      label?: string | null;
    } | null;
  };
};

export type ImageUrlScenario = {
  kind: 'image-urls';
  name: string;
  attachments?: Array<{ url: string; contentType: string | null; name?: string | null }>;
  embeds?: Array<{ image?: { url: string }; thumbnail?: { url: string } }>;
  expect: { urls: string[] };
};

export type ScenarioCase =
  | DomainDryRunScenario
  | DomainMessageScenario
  | DetectionScenario
  | ScoreScenario
  | HammingScenario
  | HashScenario
  | ImageUrlScenario;
