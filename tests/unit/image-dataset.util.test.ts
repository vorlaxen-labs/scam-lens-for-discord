import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { IMAGE_HASH_PIPELINE, buildReferenceVariantHashes } from '../../src/services/phash-compute.js';
import {
  describeImageDatasetDrift,
  parseImageHashDataset,
  serializeImageHashDataset,
  type ImageHashDatasetRow,
} from '../../src/shared/utils/image-dataset.util.js';

function row(overrides: Partial<ImageHashDatasetRow> = {}): ImageHashDatasetRow {
  return {
    file: '1.webp',
    sha256: 'a'.repeat(64),
    bytes: 12,
    variant: 'original',
    hash: 'b'.repeat(16),
    label: '1.webp',
    pipeline: IMAGE_HASH_PIPELINE,
    ...overrides,
  };
}

function threeRows(file = '1.webp'): ImageHashDatasetRow[] {
  return [
    row({ file, variant: 'original', hash: 'a'.repeat(16), label: file }),
    row({ file, variant: '1080p', hash: 'b'.repeat(16), label: `${file}@1080p` }),
    row({ file, variant: '720p', hash: 'c'.repeat(16), label: `${file}@720p` }),
  ];
}

describe('image hash dataset', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('round-trips a quoted csv', () => {
    const parsed = parseImageHashDataset(serializeImageHashDataset(threeRows()));
    expect(parsed).toEqual({ ok: true, rows: threeRows() });
  });

  it('rejects a dataset built with a different pipeline', () => {
    const csv = serializeImageHashDataset([
      ...threeRows().map((entry) => ({ ...entry, pipeline: 'stale' })),
    ]);
    const parsed = parseImageHashDataset(csv);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.reason).toContain(IMAGE_HASH_PIPELINE);
    }
  });

  it('rejects path separators in the file column', () => {
    const csv = serializeImageHashDataset(threeRows('../1.webp'));
    const parsed = parseImageHashDataset(csv);
    expect(parsed.ok).toBe(false);
  });

  it('reports when a screenshot on disk no longer matches the dataset', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scam-lens-dataset-'));
    fs.writeFileSync(path.join(tempDir, '1.webp'), 'changed-bytes');
    const drift = describeImageDatasetDrift(threeRows(), tempDir);
    expect(drift).toContain('1.webp bytes no longer match the dataset');
  });

  it('reports files that exist only on disk or only in the dataset', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scam-lens-dataset-'));
    fs.writeFileSync(path.join(tempDir, '2.png'), 'x');
    const drift = describeImageDatasetDrift(threeRows(), tempDir);
    expect(drift).toContain('2.png is not in the dataset');
    expect(drift).toContain('1.webp is in the dataset but not in');
  });

  it(
    'matches the committed dataset to data/images',
    async () => {
      const imagesDir = path.resolve('data/images');
      const csv = fs.readFileSync(path.resolve('data/image-hashes.csv'), 'utf8');
      const parsed = parseImageHashDataset(csv);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const files = fs
        .readdirSync(imagesDir)
        .filter((file) => /\.(webp|png|jpe?g|gif|avif)$/i.test(file))
        .sort();
      expect(describeImageDatasetDrift(parsed.rows, imagesDir)).toBeNull();
      expect([...new Set(parsed.rows.map((entry) => entry.file))].sort()).toEqual(files);

      for (const file of files) {
        const buffer = fs.readFileSync(path.join(imagesDir, file));
        const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
        const fileRows = parsed.rows.filter((entry) => entry.file === file);
        expect(fileRows.map((entry) => entry.variant).sort()).toEqual(['1080p', '720p', 'original']);
        expect(fileRows.every((entry) => entry.sha256 === sha256 && entry.bytes === buffer.length)).toBe(
          true,
        );
        expect(fileRows.every((entry) => entry.pipeline === IMAGE_HASH_PIPELINE)).toBe(true);
        const computed = await buildReferenceVariantHashes(buffer, file);
        expect(fileRows.map((entry) => [entry.variant, entry.hash, entry.label])).toEqual(
          computed.map((entry) => [entry.variant, entry.hash, entry.label]),
        );
      }
    },
    60_000,
  );
});
