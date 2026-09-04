import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from '../helpers/test-db.js';
import { BlockedDomainRepository } from '../../src/infra/database/repositories/blocked-domain.repository.js';
import {
  AllowedDomainRepository,
} from '../../src/infra/database/repositories/detection-log.repository.js';
import { DomainBlocklistService } from '../../src/services/domain-blocklist.service.js';
import { createMockMessage } from '../helpers/mock-message.js';

describe('DomainBlocklistService integration', () => {
  let db: Database.Database;
  let service: DomainBlocklistService;

  beforeEach(() => {
    db = createTestDb();
    const blockedRepo = new BlockedDomainRepository(db);
    const allowedRepo = new AllowedDomainRepository(db);
    service = new DomainBlocklistService(blockedRepo, allowedRepo);

    blockedRepo.upsertGlobal('evil.com', 'seed');
    blockedRepo.upsertGlobal('discord-gift.com', 'seed');
    service.loadFromDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it('matches global blocklist suffixes in message content', () => {
    const message = createMockMessage({
      content: 'claim reward at https://login.evil.com/free',
    });

    const matches = service.scanMessage(message, 'guild-1');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      domain: 'login.evil.com',
      blockedDomain: 'evil.com',
      source: 'global',
    });
  });

  it('prefers guild blocklist entries with source guild', () => {
    service.addGuildDomain('guild-1', 'custom-scam.net', 'admin-1');
    const message = createMockMessage({
      content: 'go to https://pay.custom-scam.net',
    });

    const matches = service.scanMessage(message, 'guild-1');
    expect(matches[0]?.source).toBe('guild');
    expect(matches[0]?.blockedDomain).toBe('custom-scam.net');
  });

  it('skips allowlisted domains', () => {
    service.addGuildAllowedDomain('guild-1', 'evil.com', 'admin-1');
    const message = createMockMessage({
      content: 'safe link https://login.evil.com',
    });

    expect(service.scanMessage(message, 'guild-1')).toEqual([]);
  });

  it('scans embed urls and descriptions', () => {
    const message = createMockMessage({
      embeds: [
        {
          title: 'You won',
          description: 'Visit login.evil.com now',
          url: 'https://discord-gift.com/prize',
        },
      ],
    });

    const matches = service.scanMessage(message, 'guild-1');
    expect(matches.map((match) => match.blockedDomain).sort()).toEqual(['discord-gift.com', 'evil.com']);
  });

  it('dry-runs markdown links and plain domains', () => {
    const matches = service.dryRun('[click](https://login.evil.com) or evil.com', 'guild-1');
    expect(matches.some((match) => match.blockedDomain === 'evil.com')).toBe(true);
  });

  it('handles many global domains efficiently via suffix lookup', () => {
    const blockedRepo = new BlockedDomainRepository(db);
    for (let index = 0; index < 500; index++) {
      blockedRepo.upsertGlobal(`blocked-${index}.example`, 'seed');
    }
    service.loadFromDatabase();

    const started = performance.now();
    const matches = service.dryRun('visit https://pay.blocked-250.example/path', 'guild-1');
    const elapsed = performance.now() - started;

    expect(matches[0]?.blockedDomain).toBe('blocked-250.example');
    expect(elapsed).toBeLessThan(50);
  });
});
