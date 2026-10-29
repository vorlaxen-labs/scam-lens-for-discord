import fs from 'node:fs';
import crypto from 'node:crypto';
import { getDb } from '../database/connection.js';
import { BlockedDomainRepository } from '../database/repositories/blocked-domain.repository.js';
import { ScamHashRepository } from '../database/repositories/scam-hash.repository.js';
import { SeedVersionRepository } from '../database/repositories/detection-log.repository.js';
import {
  describeImageDatasetDrift,
  parseImageHashDataset,
  type ImageHashDatasetRow,
} from '../../shared/utils/image-dataset.util.js';
import { resolveImageDatasetPath, resolveSeedDomainsPath, resolveSeedImagesDir } from '../../shared/utils/seed-path.util.js';
import { logger } from '../logger/index.js';

function normalizeDomain(raw: string): string {
  let value = raw.trim().toLowerCase();
  value = value.replace(/^www\./, '');
  value = value.replace(/[.,;:!?)>\]}]+$/, '');
  return value;
}

function loadDomainsFromFile(filePath: string): string[] {
  const content = fs.readFileSync(filePath, 'utf8');
  const domains = new Set<string>();
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const normalized = normalizeDomain(trimmed);
    if (normalized.includes('.')) {
      domains.add(normalized);
    }
  }
  return [...domains];
}

function hashDomains(domains: string[]): string {
  const sorted = [...domains].sort();
  return crypto.createHash('sha256').update(sorted.join('\n')).digest('hex');
}

export interface AppliedImageHashDataset {
  imageCount: number;
  datasetRows: number;
  removedStale: number;
}

export function applyImageHashDataset(
  hashRepo: ScamHashRepository,
  rows: readonly ImageHashDatasetRow[],
): AppliedImageHashDataset {
  const removedStale = hashRepo.removeAllGlobalSeed();
  for (const row of rows) {
    hashRepo.upsertGlobal(row.hash, row.label, 'seed');
  }
  return {
    imageCount: new Set(rows.map((row) => row.file)).size,
    datasetRows: rows.length,
    removedStale,
  };
}

export function runSeed(): void {
  const db = getDb();
  const domainRepo = new BlockedDomainRepository(db);
  const hashRepo = new ScamHashRepository(db);
  const seedVersionRepo = new SeedVersionRepository(db);

  const domainsPath = resolveSeedDomainsPath();
  if (!fs.existsSync(domainsPath)) {
    logger.warn({ domainsPath }, 'domains.txt not found — skipping domain seed');
  } else {
    const domains = loadDomainsFromFile(domainsPath);
    const domainsHash = hashDomains(domains);
    const previous = seedVersionRepo.get();

    if (!previous || previous.domainsHash !== domainsHash) {
      for (const domain of domains) {
        domainRepo.upsertGlobal(domain, 'seed');
      }
      const removed = domainRepo.removeStaleGlobalDomains(new Set(domains));
      seedVersionRepo.upsert(domainsHash, domains.length);
      logger.info(
        { count: domains.length, removed, domainsHash: domainsHash.slice(0, 12) },
        'Domain blocklist seed synced',
      );
    } else {
      logger.debug({ count: domains.length }, 'Domain blocklist seed unchanged');
    }
  }

  const datasetPath = resolveImageDatasetPath();
  if (!fs.existsSync(datasetPath)) {
    logger.warn(
      { datasetPath, imageCount: 0 },
      'Image hash dataset not found — image scam detection disabled. Run pnpm build:image-dataset',
    );
    return;
  }

  const parsed = parseImageHashDataset(fs.readFileSync(datasetPath, 'utf8'));
  if (!parsed.ok) {
    logger.error(
      { datasetPath, reason: parsed.reason },
      'Image hash dataset rejected — existing seed hashes were left unchanged',
    );
    return;
  }

  const imagesPath = resolveSeedImagesDir();
  if (fs.existsSync(imagesPath)) {
    const drift = describeImageDatasetDrift(parsed.rows, imagesPath);
    if (drift) {
      logger.warn(
        { datasetPath, imagesPath, drift },
        'Image files differ from the hash dataset. Boot is using the dataset. Run pnpm build:image-dataset',
      );
    }
  }

  const applied = applyImageHashDataset(hashRepo, parsed.rows);
  logger.info(
    {
      imageCount: applied.imageCount,
      datasetRows: applied.datasetRows,
      removedStale: applied.removedStale,
      datasetPath,
    },
    'Image hash dataset loaded',
  );
}
