import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('parseLockPid', () => {
  it('accepts positive integer pids', async () => {
    const { parseLockPid } = await import('../../src/infra/bootstrap/single-instance.js');
    expect(parseLockPid('50')).toBe(50);
    expect(parseLockPid('  123  ')).toBe(123);
  });

  it('rejects invalid lock contents', async () => {
    const { parseLockPid } = await import('../../src/infra/bootstrap/single-instance.js');
    expect(parseLockPid('')).toBeNull();
    expect(parseLockPid('abc')).toBeNull();
    expect(parseLockPid('0')).toBeNull();
    expect(parseLockPid('-1')).toBeNull();
  });
});

describe('shouldTakeOverLock', () => {
  it('takes over when the lock pid matches the current process', async () => {
    const { shouldTakeOverLock } = await import('../../src/infra/bootstrap/single-instance.js');
    expect(shouldTakeOverLock(50, 50, () => 'node dist/infra/bootstrap/index.js')).toBe(true);
  });

  it('takes over when cmdline is missing on linux', async () => {
    const { shouldTakeOverLock } = await import('../../src/infra/bootstrap/single-instance.js');
    expect(shouldTakeOverLock(99999, process.pid, () => null)).toBe(true);
  });

  it('takes over when cmdline is not a scam-lens process', async () => {
    const { shouldTakeOverLock } = await import('../../src/infra/bootstrap/single-instance.js');
    expect(shouldTakeOverLock(99999, process.pid, () => 'sh -c pnpm install')).toBe(true);
  });

  it('keeps the lock when another scam-lens bootstrap process is alive', async () => {
    const { shouldTakeOverLock } = await import('../../src/infra/bootstrap/single-instance.js');
    expect(
      shouldTakeOverLock(99999, process.pid, () => 'node dist/infra/bootstrap/index.js'),
    ).toBe(false);
  });

  it('keeps the lock when another tsx bootstrap dev process is alive', async () => {
    const { shouldTakeOverLock } = await import('../../src/infra/bootstrap/single-instance.js');
    expect(
      shouldTakeOverLock(
        99999,
        process.pid,
        () => 'node /app/node_modules/tsx/dist/cli.mjs watch src/infra/bootstrap/index.ts',
      ),
    ).toBe(false);
  });
});

describe('acquireSingleInstanceLock', () => {
  let tempDir = '';

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    vi.restoreAllMocks();
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = '';
    }
  });

  it('removes a stale lock when the pid matches the current process', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scam-lens-lock-'));
    vi.stubEnv('DATABASE_PATH', path.join(tempDir, 'scam-lens.db'));

    const lockPath = path.join(tempDir, 'scam-lens.pid');
    fs.writeFileSync(lockPath, String(process.pid));

    const { acquireSingleInstanceLock } = await import('../../src/infra/bootstrap/single-instance.js');

    expect(() => acquireSingleInstanceLock()).not.toThrow();
    expect(fs.readFileSync(lockPath, 'utf8').trim()).toBe(String(process.pid));
  });

  it('stores the lock next to DATABASE_PATH', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scam-lens-lock-'));
    vi.stubEnv('DATABASE_PATH', path.join(tempDir, 'nested', 'scam-lens.db'));

    const { acquireSingleInstanceLock, getInstanceLockPath } = await import(
      '../../src/infra/bootstrap/single-instance.js'
    );

    acquireSingleInstanceLock();

    expect(getInstanceLockPath()).toBe(path.join(tempDir, 'nested', 'scam-lens.pid'));
    expect(fs.existsSync(getInstanceLockPath())).toBe(true);
  });

  it('uses data/scam-lens.pid when DATABASE_PATH is :memory:', async () => {
    vi.stubEnv('DATABASE_PATH', ':memory:');

    const { getInstanceLockPath } = await import('../../src/infra/bootstrap/single-instance.js');

    expect(getInstanceLockPath()).toBe(path.resolve(process.cwd(), 'data/scam-lens.pid'));
  });

  it('uses the docker production database path for the lock file', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scam-lens-lock-'));
    vi.stubEnv('DATABASE_PATH', '/app/data/scam-lens.db');

    const { getInstanceLockPath } = await import('../../src/infra/bootstrap/single-instance.js');

    expect(getInstanceLockPath()).toBe('/app/data/scam-lens.pid');
  });

  it('replaces invalid lock files instead of crashing', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scam-lens-lock-'));
    vi.stubEnv('DATABASE_PATH', path.join(tempDir, 'scam-lens.db'));

    const lockPath = path.join(tempDir, 'scam-lens.pid');
    fs.writeFileSync(lockPath, 'not-a-pid');

    const { acquireSingleInstanceLock } = await import('../../src/infra/bootstrap/single-instance.js');
    acquireSingleInstanceLock();

    expect(fs.readFileSync(lockPath, 'utf8').trim()).toBe(String(process.pid));
  });

  it('exits when another live scam-lens process owns the lock', async () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scam-lens-lock-'));
    vi.stubEnv('DATABASE_PATH', path.join(tempDir, 'scam-lens.db'));

    const lockPath = path.join(tempDir, 'scam-lens.pid');
    fs.writeFileSync(lockPath, '4242');

    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as typeof process.exit);

    const readFileSyncSpy = vi.spyOn(fs, 'readFileSync').mockImplementation((targetPath, encoding) => {
      const normalized = String(targetPath);
      if (normalized === lockPath) {
        return '4242';
      }
      if (normalized === '/proc/4242/cmdline') {
        return 'node\0dist/infra/bootstrap/index.js\0';
      }
      return vi.mocked(fs.readFileSync).getMockImplementation()?.(targetPath, encoding)
        ?? Buffer.from('');
    });

    const { acquireSingleInstanceLock } = await import('../../src/infra/bootstrap/single-instance.js');

    expect(() => acquireSingleInstanceLock()).toThrow('process.exit:1');
    expect(exitSpy).toHaveBeenCalledWith(1);

    readFileSyncSpy.mockRestore();
    exitSpy.mockRestore();
  });
});
