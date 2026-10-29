import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  resolveImageDatasetPath,
  resolveSeedDomainsPath,
  resolveSeedImagesDir,
} from '../../src/shared/utils/seed-path.util.js';

describe('seed path resolution', () => {
  let tempDir = '';

  afterEach(() => {
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('prefers seed/ paths over data/ paths when both exist', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scam-lens-seed-'));
    const seedDomains = path.join(tempDir, 'seed/text/domains.txt');
    const dataDomains = path.join(tempDir, 'data/text/domains.txt');
    fs.mkdirSync(path.dirname(seedDomains), { recursive: true });
    fs.mkdirSync(path.dirname(dataDomains), { recursive: true });
    fs.writeFileSync(seedDomains, 'seed.example\n');
    fs.writeFileSync(dataDomains, 'data.example\n');

    const previousCwd = process.cwd();
    process.chdir(tempDir);
    try {
      expect(resolveSeedDomainsPath()).toBe(seedDomains);
    } finally {
      process.chdir(previousCwd);
    }
  });

  it('falls back to data/images for local development', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scam-lens-seed-'));
    const imagesDir = path.join(tempDir, 'data/images');
    fs.mkdirSync(imagesDir, { recursive: true });

    const previousCwd = process.cwd();
    process.chdir(tempDir);
    try {
      expect(resolveSeedImagesDir()).toBe(imagesDir);
    } finally {
      process.chdir(previousCwd);
    }
  });

  it('prefers seed/image-hashes.csv over data/image-hashes.csv', () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scam-lens-seed-'));
    const seedDataset = path.join(tempDir, 'seed/image-hashes.csv');
    const dataDataset = path.join(tempDir, 'data/image-hashes.csv');
    fs.mkdirSync(path.dirname(seedDataset), { recursive: true });
    fs.mkdirSync(path.dirname(dataDataset), { recursive: true });
    fs.writeFileSync(seedDataset, 'seed\n');
    fs.writeFileSync(dataDataset, 'data\n');

    const previousCwd = process.cwd();
    process.chdir(tempDir);
    try {
      expect(resolveImageDatasetPath()).toBe(seedDataset);
    } finally {
      process.chdir(previousCwd);
    }
  });
});
