import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import type Database from 'better-sqlite3';
import { createTestDb } from '../helpers/test-db.js';
import {
  AllowedDomainRepository,
  DetectionLogRepository,
} from '../../src/infra/database/repositories/detection-log.repository.js';
import type { DetectionContext } from '../../src/shared/types/index.js';

function createDetectionContext(overrides: Partial<DetectionContext> = {}): DetectionContext {
  return {
    operationId: 'SL-TEST001',
    guildId: 'guild-1',
    userId: 'user-1',
    username: 'testuser',
    messageId: 'msg-1',
    channelId: 'channel-1',
    detectionType: 'domain',
    matchedValue: 'evil.com',
    hammingDistance: null,
    actionTaken: 'delete',
    actionResult: 'delete:success',
    metadataJson: '{}',
    domainMatches: [{ domain: 'login.evil.com', blockedDomain: 'evil.com', source: 'global' }],
    imageMatches: [],
    phashThreshold: 8,
    phashStrictThreshold: 3,
    actionMode: 1,
    trustScore: 60,
    ...overrides,
  };
}

describe('DetectionLogRepository', () => {
  let db: Database.Database;
  let repo: DetectionLogRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new DetectionLogRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('inserts and finds detection logs with trust score', () => {
    repo.insert(createDetectionContext());
    const record = repo.findByOperationId('SL-TEST001');

    expect(record).not.toBeNull();
    expect(record!.trustScore).toBe(60);
    expect(record!.matchedValue).toBe('evil.com');
    expect(record!.restoredAt).toBeNull();
  });

  it('marks a detection as restored once', () => {
    repo.insert(createDetectionContext());
    expect(repo.markRestored('SL-TEST001', 'mod-1')).toBe(true);
    expect(repo.markRestored('SL-TEST001', 'mod-2')).toBe(false);

    const record = repo.findByOperationId('SL-TEST001');
    expect(record!.restoredBy).toBe('mod-1');
    expect(record!.restoredAt).not.toBeNull();
  });
});

describe('AllowedDomainRepository', () => {
  let db: Database.Database;
  let repo: AllowedDomainRepository;

  beforeEach(() => {
    db = createTestDb();
    repo = new AllowedDomainRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('adds, lists, and removes allowlisted domains', () => {
    repo.add('guild-1', 'trusted.com', 'admin-1');
    repo.add('guild-1', 'trusted.com', 'admin-1');
    expect(repo.listForGuild('guild-1')).toEqual(['trusted.com']);

    expect(repo.remove('guild-1', 'trusted.com')).toBe(true);
    expect(repo.remove('guild-1', 'trusted.com')).toBe(false);
    expect(repo.listForGuild('guild-1')).toEqual([]);
  });
});
