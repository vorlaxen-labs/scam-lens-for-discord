import fs from 'node:fs';
import path from 'node:path';

export function resolveSeedDomainsPath(): string {
  const candidates = [
    path.resolve(process.cwd(), 'seed/text/domains.txt'),
    path.resolve(process.cwd(), 'data/text/domains.txt'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}

export function resolveSeedImagesDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'seed/images'),
    path.resolve(process.cwd(), 'data/images'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return candidates[0];
}
