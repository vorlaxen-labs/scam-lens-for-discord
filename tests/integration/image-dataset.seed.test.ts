import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyImageHashDataset } from '../../src/infra/bootstrap/seed.js';
import { ScamHashRepository } from '../../src/infra/database/repositories/scam-hash.repository.js';
import { IMAGE_HASH_PIPELINE } from '../../src/services/phash-compute.js';
import type { ImageHashDatasetRow } from '../../src/shared/utils/image-dataset.util.js';
import { createTestDb } from '../helpers/test-db.js';

function threeRows(): ImageHashDatasetRow[] {
  return [
    {
      file: '1.webp',
      sha256: 'a'.repeat(64),
      bytes: 12,
      variant: 'original',
      hash: 'aaaaaaaaaaaaaaaa',
      label: '1.webp',
      pipeline: IMAGE_HASH_PIPELINE,
    },
    {
      file: '1.webp',
      sha256: 'a'.repeat(64),
      bytes: 12,
      variant: '1080p',
      hash: 'bbbbbbbbbbbbbbbb',
      label: '1.webp@1080p',
      pipeline: IMAGE_HASH_PIPELINE,
    },
    {
      file: '1.webp',
      sha256: 'a'.repeat(64),
      bytes: 12,
      variant: '720p',
      hash: 'cccccccccccccccc',
      label: '1.webp@720p',
      pipeline: IMAGE_HASH_PIPELINE,
    },
  ];
}

describe('applyImageHashDataset', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    db = createTestDb();
  });

  afterEach(() => {
    db.close();
  });

  it('replaces global seed hashes and keeps guild hashes', () => {
    const repo = new ScamHashRepository(db);
    repo.upsertGlobal('dddddddddddddddd', 'old.webp', 'seed');
    repo.upsertGuild('guild-1', 'eeeeeeeeeeeeeeee', 'guild.webp', 'admin-1');

    const applied = applyImageHashDataset(repo, threeRows());

    expect(applied).toEqual({ imageCount: 1, datasetRows: 3, removedStale: 1 });
    expect(repo.listAll().map((record) => record.hash).sort()).toEqual([
      'aaaaaaaaaaaaaaaa',
      'bbbbbbbbbbbbbbbb',
      'cccccccccccccccc',
      'eeeeeeeeeeeeeeee',
    ]);
    expect(repo.listAll().filter((record) => record.guildId === 'guild-1')).toHaveLength(1);
  });
});
