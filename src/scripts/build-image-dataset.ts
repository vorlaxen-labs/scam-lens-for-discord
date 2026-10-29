import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../infra/logger/index.js';
import { IMAGE_HASH_PIPELINE, buildReferenceVariantHashes } from '../services/phash-compute.js';
import {
  listSeedImageFiles,
  serializeImageHashDataset,
  type ImageHashDatasetRow,
} from '../shared/utils/image-dataset.util.js';
import { resolveSeedImagesDir } from '../shared/utils/seed-path.util.js';

async function main(): Promise<void> {
  const imagesDir = resolveSeedImagesDir();
  if (!fs.existsSync(imagesDir)) {
    logger.error({ imagesDir }, 'Seed image directory not found');
    process.exit(1);
  }

  const files = listSeedImageFiles(imagesDir);
  if (files.length === 0) {
    logger.error({ imagesDir }, 'Seed image directory has no images');
    process.exit(1);
  }

  const rows: ImageHashDatasetRow[] = [];
  for (const file of files) {
    const buffer = fs.readFileSync(path.join(imagesDir, file));
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const variants = await buildReferenceVariantHashes(buffer, file);
    for (const variant of variants) {
      rows.push({
        file,
        sha256,
        bytes: buffer.length,
        variant: variant.variant,
        hash: variant.hash,
        label: variant.label,
        pipeline: IMAGE_HASH_PIPELINE,
      });
    }
    logger.info({ file, bytes: buffer.length }, 'Hashed seed image');
  }

  const outputPath = path.resolve(process.cwd(), 'data/image-hashes.csv');
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, serializeImageHashDataset(rows));
  logger.info(
    { outputPath, imageCount: files.length, datasetRows: rows.length, pipeline: IMAGE_HASH_PIPELINE },
    'Image hash dataset written',
  );
}

main().catch((error) => {
  logger.error({ error }, 'Image hash dataset build failed');
  process.exit(1);
});
