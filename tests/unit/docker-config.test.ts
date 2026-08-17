import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(import.meta.dirname, '../..');

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
}

describe('docker production config', () => {
  it('defines a persistent /app/data volume in docker-compose.prod.yml', () => {
    const compose = readRepoFile('docker-compose.prod.yml');

    expect(compose).toMatch(/DATABASE_PATH:\s*\/app\/data\/scam-lens\.db/);
    expect(compose).toMatch(/scam-lens-data:\/app\/data/);
    expect(compose).toMatch(/dockerfile:\s*Dockerfile\.prod/);
    expect(compose).toMatch(/restart:\s*unless-stopped/);
  });

  it('builds a production image with the docker database path and seed data', () => {
    const dockerfile = readRepoFile('Dockerfile.prod');

    expect(dockerfile).toMatch(/NODE_ENV=production/);
    expect(dockerfile).toMatch(/DATABASE_PATH=\/app\/data\/scam-lens\.db/);
    expect(dockerfile).toMatch(/COPY --from=builder.*\/app\/data\/text \.\/data\/text/);
    expect(dockerfile).toMatch(/VOLUME \["\/app\/data"\]/);
    expect(dockerfile).toMatch(/node dist\/infra\/bootstrap\/index\.js/);
  });

  it('keeps secrets and runtime sqlite files out of the build context', () => {
    const dockerignore = readRepoFile('.dockerignore');

    expect(dockerignore).toMatch(/data\/scam-lens\.db/);
    expect(dockerignore).toMatch(/env\/\.env\.production/);
    expect(dockerignore).toMatch(/node_modules/);
    expect(dockerignore).toMatch(/dist/);
  });

  it('documents coolify native backup and required persistent storage', () => {
    const docs = readRepoFile('docs/self-hosting.md');

    expect(docs).toMatch(/Persistent storage \(required\)/i);
    expect(docs).toMatch(/\/app\/data/);
    expect(docs).toMatch(/Coolify native backup/i);
    expect(docs).toMatch(/Replicas.*1/s);
  });
});

describe('docker development config', () => {
  it('bind-mounts source and keeps node_modules inside the container', () => {
    const compose = readRepoFile('docker-compose.dev.yml');

    expect(compose).toMatch(/\.:\/app/);
    expect(compose).toMatch(/\/app\/node_modules/);
    expect(compose).toMatch(/\.\/data:\/app\/data/);
    expect(compose).toMatch(/DATABASE_PATH:\s*\/app\/data\/scam-lens\.db/);
    expect(compose).toMatch(/pnpm install --frozen-lockfile && pnpm dev/);
  });
});
