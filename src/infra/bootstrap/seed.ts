import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { getDb } from '../database/connection.js';
import { BlockedDomainRepository } from '../database/repositories/blocked-domain.repository.js';
import { ScamHashRepository } from '../database/repositories/scam-hash.repository.js';
import { SeedVersionRepository } from '../database/repositories/detection-log.repository.js';
import { PhashService, simulateDiscordUpload } from '../../services/phash.service.js';
import { resolveSeedDomainsPath, resolveSeedImagesDir } from '../../shared/utils/seed-path.util.js';
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

export async function runSeed(phashService: PhashService): Promise<void> {
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

  const imagesPath = resolveSeedImagesDir();
  if (!fs.existsSync(imagesPath)) {
    logger.warn({ imagesPath }, 'Seed image directory not found — skipping image seed');
    return;
  }

  const imageFiles = fs.readdirSync(imagesPath).filter((file) => /\.(webp|png|jpe?g|gif|avif)$/i.test(file));
  if (imageFiles.length === 0) {
    logger.warn({ imagesPath }, 'Seed image directory is empty — image detection disabled');
    return;
  }

  const removed = hashRepo.removeAllGlobalSeed();
  let variantCount = 0;

  for (const file of imageFiles) {
    const filePath = path.join(imagesPath, file);
    const buffer = fs.readFileSync(filePath);

    const variants: Array<{ buffer: Buffer; label: string }> = [
      { buffer, label: file },
      { buffer: await simulateDiscordUpload(buffer, 1920, 1080), label: `${file}@1080p` },
      { buffer: await simulateDiscordUpload(buffer, 1280, 720), label: `${file}@720p` },
    ];

    for (const variant of variants) {
      const hash = await phashService.computeHashFromBuffer(variant.buffer);
      hashRepo.upsertGlobal(hash, variant.label, 'seed');
      variantCount += 1;
      logger.debug({ file: variant.label, hash }, 'Seeded scam image hash');
    }
  }

  logger.info(
    { imageCount: imageFiles.length, hashCount: variantCount, removedStale: removed },
    'Image hash seed complete',
  );
}
