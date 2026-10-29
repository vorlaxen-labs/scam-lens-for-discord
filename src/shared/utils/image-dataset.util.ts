import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {
  IMAGE_HASH_PIPELINE,
  IMAGE_HASH_VARIANTS,
  type ImageHashVariant,
} from '../../services/phash-compute.js';

export const IMAGE_FILE_PATTERN = /\.(webp|png|jpe?g|gif|avif)$/i;

export const IMAGE_DATASET_COLUMNS = [
  'file',
  'sha256',
  'bytes',
  'variant',
  'hash',
  'label',
  'pipeline',
] as const;

export interface ImageHashDatasetRow {
  file: string;
  sha256: string;
  bytes: number;
  variant: ImageHashVariant;
  hash: string;
  label: string;
  pipeline: string;
}

export type ParsedImageHashDataset =
  | { ok: true; rows: ImageHashDatasetRow[] }
  | { ok: false; reason: string };

const HASH_PATTERN = /^[0-9a-f]{16}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export function listSeedImageFiles(imagesDir: string): string[] {
  return fs
    .readdirSync(imagesDir)
    .filter((file) => IMAGE_FILE_PATTERN.test(file))
    .sort();
}

export function serializeImageHashDataset(rows: readonly ImageHashDatasetRow[]): string {
  const lines = [IMAGE_DATASET_COLUMNS.join(',')];
  for (const row of rows) {
    lines.push(
      [
        row.file,
        row.sha256,
        String(row.bytes),
        row.variant,
        row.hash,
        row.label,
        row.pipeline,
      ]
        .map(escapeCsvField)
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
}

export function parseImageHashDataset(csv: string): ParsedImageHashDataset {
  const lines = csv.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim() !== '');
  if (lines.length === 0) {
    return { ok: false, reason: 'Image hash dataset is empty' };
  }

  const header = parseCsvLine(lines[0]!);
  if (!header || header.join(',') !== IMAGE_DATASET_COLUMNS.join(',')) {
    return { ok: false, reason: `Image hash dataset header must be ${IMAGE_DATASET_COLUMNS.join(',')}` };
  }

  const rows: ImageHashDatasetRow[] = [];
  const seen = new Set<string>();

  for (let index = 1; index < lines.length; index += 1) {
    const fields = parseCsvLine(lines[index]!);
    if (!fields || fields.length !== IMAGE_DATASET_COLUMNS.length) {
      return { ok: false, reason: `Invalid CSV at line ${index + 1}` };
    }

    const [file, sha256, bytesRaw, variantRaw, hash, label, pipeline] = fields as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];

    if (!isSafeFileName(file)) {
      return { ok: false, reason: `Invalid file name at line ${index + 1}` };
    }
    if (!SHA256_PATTERN.test(sha256)) {
      return { ok: false, reason: `Invalid sha256 at line ${index + 1}` };
    }
    if (!/^[1-9]\d*$/.test(bytesRaw)) {
      return { ok: false, reason: `Invalid byte size at line ${index + 1}` };
    }
    if (!isImageHashVariant(variantRaw)) {
      return { ok: false, reason: `Invalid variant at line ${index + 1}` };
    }
    if (!HASH_PATTERN.test(hash)) {
      return { ok: false, reason: `Invalid pHash at line ${index + 1}` };
    }
    if (!label) {
      return { ok: false, reason: `Missing label at line ${index + 1}` };
    }
    if (pipeline !== IMAGE_HASH_PIPELINE) {
      return {
        ok: false,
        reason: `Dataset pipeline ${pipeline} does not match ${IMAGE_HASH_PIPELINE}. Rebuild with pnpm build:image-dataset`,
      };
    }

    const key = `${file}:${variantRaw}`;
    if (seen.has(key)) {
      return { ok: false, reason: `Duplicate ${key}` };
    }
    seen.add(key);

    rows.push({
      file,
      sha256,
      bytes: Number(bytesRaw),
      variant: variantRaw,
      hash,
      label,
      pipeline,
    });
  }

  if (rows.length === 0) {
    return { ok: false, reason: 'Image hash dataset has no rows' };
  }

  const grouped = new Map<string, ImageHashDatasetRow[]>();
  for (const row of rows) {
    const group = grouped.get(row.file) ?? [];
    group.push(row);
    grouped.set(row.file, group);
  }

  for (const [file, group] of grouped) {
    const variants = new Set(group.map((row) => row.variant));
    if (variants.size !== IMAGE_HASH_VARIANTS.length) {
      return { ok: false, reason: `${file} must include original, 1080p, and 720p rows` };
    }
    const sha256 = group[0]!.sha256;
    const bytes = group[0]!.bytes;
    if (group.some((row) => row.sha256 !== sha256 || row.bytes !== bytes)) {
      return { ok: false, reason: `${file} rows disagree on sha256 or bytes` };
    }
  }

  return { ok: true, rows };
}

export function describeImageDatasetDrift(
  rows: readonly ImageHashDatasetRow[],
  imagesDir: string,
): string | null {
  const filesOnDisk = listSeedImageFiles(imagesDir);
  const byFile = new Map<string, ImageHashDatasetRow>();
  for (const row of rows) {
    if (!byFile.has(row.file)) byFile.set(row.file, row);
  }

  const problems: string[] = [];
  const diskSet = new Set(filesOnDisk);
  for (const file of filesOnDisk) {
    const row = byFile.get(file);
    if (!row) {
      problems.push(`${file} is not in the dataset`);
      continue;
    }
    const buffer = fs.readFileSync(path.join(imagesDir, file));
    const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    if (row.sha256 !== sha256 || row.bytes !== buffer.length) {
      problems.push(`${file} bytes no longer match the dataset`);
    }
  }

  for (const file of byFile.keys()) {
    if (!diskSet.has(file)) {
      problems.push(`${file} is in the dataset but not in ${imagesDir}`);
    }
  }

  return problems.length > 0 ? problems.join('; ') : null;
}

function isImageHashVariant(value: string): value is ImageHashVariant {
  return (IMAGE_HASH_VARIANTS as readonly string[]).includes(value);
}

function isSafeFileName(file: string): boolean {
  return file.length > 0 && !file.includes('/') && !file.includes('\\') && file !== '.' && file !== '..';
}

function escapeCsvField(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

function parseCsvLine(line: string): string[] | null {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!;
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      if (current.length > 0) return null;
      inQuotes = true;
      continue;
    }
    if (char === ',') {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (inQuotes) return null;
  fields.push(current);
  return fields;
}
