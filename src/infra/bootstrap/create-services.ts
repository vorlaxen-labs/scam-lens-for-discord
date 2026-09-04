import { getDb } from '../database/connection.js';
import { BlockedDomainRepository } from '../database/repositories/blocked-domain.repository.js';
import { ScamHashRepository } from '../database/repositories/scam-hash.repository.js';
import {
  AllowedDomainRepository,
  DetectionLogRepository,
} from '../database/repositories/detection-log.repository.js';
import { GuildSettingsRepository } from '../database/repositories/guild-settings.repository.js';
import { MessageDedupRepository } from '../database/repositories/message-dedup.repository.js';
import { CooldownService } from '../../services/cooldown.service.js';
import { DomainBlocklistService } from '../../services/domain-blocklist.service.js';
import { DetectionLogService } from '../../services/detection-log.service.js';
import { GuildSettingsService } from '../../services/guild-settings.service.js';
import { PhashService } from '../../services/phash.service.js';
import { ScamDetectionService } from '../../services/scam-detection.service.js';
import { PresenceService } from '../../services/presence.service.js';
import { TelemetryService } from '../../services/telemetry.service.js';
import type { Services } from '../../shared/types/index.js';
import type { Client } from 'discord.js';

export function createServices(client: Client): Services {
  const db = getDb();

  const guildSettingsRepository = new GuildSettingsRepository(db);
  const blockedDomainRepository = new BlockedDomainRepository(db);
  const scamHashRepository = new ScamHashRepository(db);
  const allowedDomainRepository = new AllowedDomainRepository(db);
  const detectionLogRepository = new DetectionLogRepository(db);
  const messageDedupRepository = new MessageDedupRepository(db);
  messageDedupRepository.purgeOlderThan(24);

  const guildSettingsService = new GuildSettingsService(guildSettingsRepository);
  const domainBlocklistService = new DomainBlocklistService(
    blockedDomainRepository,
    allowedDomainRepository,
  );
  const phashService = new PhashService();
  const detectionLogService = new DetectionLogService(detectionLogRepository, client);
  const telemetryService = new TelemetryService(client);
  const scamDetectionService = new ScamDetectionService(guildSettingsService, detectionLogService);
  const cooldownService = new CooldownService();
  const presenceService = new PresenceService(client, () => ({
    guildCount: client.guilds.cache.size,
    globalDomainCount: domainBlocklistService.getGlobalDomainCount(),
    globalHashCount: phashService.getHashCounts().global,
  }));

  domainBlocklistService.loadFromDatabase();
  phashService.setHashRecords(scamHashRepository.listAll());

  return {
    guildSettingsService,
    domainBlocklistService,
    phashService,
    scamDetectionService,
    detectionLogService,
    telemetryService,
    cooldownService,
    messageDedupRepository,
    presenceService,
  };
}

export function refreshRuntimeCaches(services: Services): void {
  const db = getDb();
  services.domainBlocklistService.loadFromDatabase();
  services.phashService.refreshHashRecords(new ScamHashRepository(db).listAll());
}
