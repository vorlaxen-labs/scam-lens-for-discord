import { ulid } from 'ulid';
import type { DetectionContext, Services } from '../../src/shared/types/index.js';
import { BlockedDomainRepository } from '../../src/infra/database/repositories/blocked-domain.repository.js';
import {
  AllowedDomainRepository,
} from '../../src/infra/database/repositories/detection-log.repository.js';
import { GuildSettingsRepository } from '../../src/infra/database/repositories/guild-settings.repository.js';
import { MessageDedupRepository } from '../../src/infra/database/repositories/message-dedup.repository.js';
import { DomainBlocklistService } from '../../src/services/domain-blocklist.service.js';
import { GuildSettingsService } from '../../src/services/guild-settings.service.js';
import { PhashService } from '../../src/services/phash.service.js';
import { ScamDetectionService } from '../../src/services/scam-detection.service.js';
import type { DetectionLogService } from '../../src/services/detection-log.service.js';
import { createTestDb } from '../helpers/test-db.js';
import type { BlocklistSeed } from './types.js';

export type ScenarioWorld = {
  blockedDomains: BlockedDomainRepository;
  blocklist: DomainBlocklistService;
  guildSettings: GuildSettingsService;
  detection: ScamDetectionService;
  phash: PhashService;
  dedup: MessageDedupRepository;
  records: DetectionContext[];
  asServices: () => Services;
  close: () => void;
};

export function createScenarioWorld(): ScenarioWorld {
  const db = createTestDb();
  const blockedDomains = new BlockedDomainRepository(db);
  const allowedDomains = new AllowedDomainRepository(db);
  const blocklist = new DomainBlocklistService(blockedDomains, allowedDomains);
  const guildSettings = new GuildSettingsService(new GuildSettingsRepository(db));
  const records: DetectionContext[] = [];
  const detectionLog = {
    createOperationId: () => `SL-${ulid()}`,
    record: async (context: DetectionContext) => {
      records.push(context);
      return context.operationId;
    },
  } as unknown as DetectionLogService;

  const detection = new ScamDetectionService(guildSettings, detectionLog);
  const phash = new PhashService();
  const dedup = new MessageDedupRepository(db);

  return {
    blockedDomains,
    blocklist,
    guildSettings,
    detection,
    phash,
    dedup,
    records,
    asServices: () =>
      ({
        guildSettingsService: guildSettings,
        domainBlocklistService: blocklist,
        phashService: phash,
        scamDetectionService: detection,
        detectionLogService: detectionLog,
        messageDedupRepository: dedup,
      }) as Services,
    close: () => {
      db.close();
    },
  };
}

export function seedBlocklist(world: ScenarioWorld, seed: BlocklistSeed): string {
  const seedGuildId = seed.seedGuildId ?? seed.guildId ?? 'guild-1';
  const scanGuildId = seed.guildId ?? 'guild-1';

  for (const domain of seed.globalDomains ?? []) {
    world.blockedDomains.upsertGlobal(domain, 'seed');
  }
  world.blocklist.loadFromDatabase();

  for (const domain of seed.guildDomains ?? []) {
    world.blocklist.addGuildDomain(seedGuildId, domain, 'scenario');
  }
  for (const domain of seed.allowedDomains ?? []) {
    world.blocklist.addGuildAllowedDomain(seedGuildId, domain, 'scenario');
  }

  return scanGuildId;
}
