import { expect } from 'vitest';
import type { GuildSettings } from '../../src/shared/types/index.js';
import { collectMessageImageUrls } from '../../src/shared/utils/message-image.util.js';
import {
  computeTrustScore,
  shouldApplyTimeout,
  shouldAutoBan,
} from '../../src/services/scam-detection.service.js';
import { createMockMessage } from '../helpers/mock-message.js';
import {
  assertDetectionOutcome,
  assertDomainMatches,
  assertHamming,
  assertHashMatch,
  assertScore,
} from './assert-scenario.js';
import { buildDetectionMessage } from './scenario-message.js';
import { seedBlocklist, type ScenarioWorld } from './scenario-world.js';
import type { ScenarioCase } from './types.js';

export async function runScenario(world: ScenarioWorld, scenario: ScenarioCase): Promise<void> {
  switch (scenario.kind) {
    case 'domain-dry-run': {
      const guildId = seedBlocklist(world, scenario);
      assertDomainMatches(world.blocklist.dryRun(scenario.text, guildId), scenario.expect.matches);
      return;
    }
    case 'domain-message': {
      const guildId = seedBlocklist(world, scenario);
      const message = createMockMessage({
        content: scenario.content,
        embeds: scenario.embeds,
        components: scenario.components,
      });
      assertDomainMatches(world.blocklist.scanMessage(message, guildId), scenario.expect.matches);
      return;
    }
    case 'detection': {
      applySettings(world, scenario.settings);
      const prepared = buildDetectionMessage(scenario);
      await world.detection.handleDetection(prepared.message, {
        domainMatches: scenario.domainMatches,
        imageMatches: scenario.imageMatches,
      });
      assertDetectionOutcome(world.records[0], prepared, scenario.expect);
      return;
    }
    case 'score': {
      assertScore(
        {
          trustScore: computeTrustScore(
            scenario.domainMatches,
            scenario.imageMatches,
            scenario.strictThreshold,
          ),
          autoBan: shouldAutoBan(
            scenario.domainMatches,
            scenario.imageMatches,
            scenario.strictThreshold,
          ),
          applyTimeout:
            scenario.timeoutEnabled === undefined
              ? undefined
              : shouldApplyTimeout(scenario.timeoutEnabled, scenario.willBan ?? false),
        },
        scenario.expect,
      );
      return;
    }
    case 'hamming': {
      assertHamming(scenario);
      return;
    }
    case 'hash': {
      world.phash.setHashRecords(
        scenario.records.map((record, index) => ({
          id: index + 1,
          ...record,
        })),
      );
      assertHashMatch(
        world.phash.matchHash(scenario.input, scenario.threshold, scenario.guildId),
        scenario.expect.match,
      );
      return;
    }
    case 'image-urls': {
      const urls = collectMessageImageUrls(
        createMockMessage({
          attachments: scenario.attachments,
          embeds: scenario.embeds,
        }),
      );
      expect(urls).toEqual(scenario.expect.urls);
      return;
    }
    default: {
      const unreachable: never = scenario;
      throw new Error(`Unknown scenario kind: ${JSON.stringify(unreachable)}`);
    }
  }
}

function applySettings(
  world: ScenarioWorld,
  patch: Partial<GuildSettings> | undefined,
): void {
  const current = world.guildSettings.getOrCreate('guild-1');
  world.guildSettings.update({
    ...current,
    actionMode: 1,
    enabled: true,
    timeoutEnabled: false,
    timeoutDurationSeconds: 3600,
    phashThreshold: 8,
    phashStrictThreshold: 3,
    skipBots: true,
    skipWebhooks: false,
    exemptRoleIds: [],
    ...patch,
  });
}
