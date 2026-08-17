import fs from 'node:fs';
import path from 'node:path';
import { databaseConfig } from '../../config/index.js';
import { logger } from '../logger/index.js';

const LOCK_PATH = resolveInstanceLockPath(databaseConfig.path);
const SCAM_LENS_CMDLINE_PATTERN = /bootstrap|scam-lens-discord-bot/;

export function resolveInstanceLockPath(dbPath: string): string {
  if (dbPath === ':memory:') {
    return path.resolve(process.cwd(), 'data/scam-lens.pid');
  }

  return path.join(path.dirname(path.resolve(dbPath)), 'scam-lens.pid');
}

export function parseLockPid(raw: string): number | null {
  const pid = Number(raw.trim());
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function readLockPidFromDisk(): number | null {
  if (!fs.existsSync(LOCK_PATH)) {
    return null;
  }

  return parseLockPid(fs.readFileSync(LOCK_PATH, 'utf8'));
}

function readProcessCmdline(pid: number): string | null {
  if (process.platform !== 'linux') {
    return null;
  }

  try {
    return fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replaceAll('\0', ' ');
  } catch {
    return null;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function shouldTakeOverLock(
  existingPid: number,
  currentPid: number,
  getCmdline: (pid: number) => string | null = readProcessCmdline,
): boolean {
  if (existingPid === currentPid) {
    return true;
  }

  if (process.platform === 'linux') {
    const cmdline = getCmdline(existingPid);
    if (!cmdline) {
      return true;
    }
    return !SCAM_LENS_CMDLINE_PATTERN.test(cmdline);
  }

  return !isProcessAlive(existingPid);
}

export function acquireSingleInstanceLock(): void {
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });

  if (fs.existsSync(LOCK_PATH)) {
    const existingPid = readLockPidFromDisk();

    if (existingPid === null) {
      logger.warn({ lockPath: LOCK_PATH }, 'Removing invalid instance lock');
      fs.unlinkSync(LOCK_PATH);
    } else if (shouldTakeOverLock(existingPid, process.pid)) {
      logger.warn({ pid: existingPid, lockPath: LOCK_PATH }, 'Removing stale instance lock');
      fs.unlinkSync(LOCK_PATH);
    } else {
      logger.error(
        { pid: existingPid, lockPath: LOCK_PATH },
        'Another Scam Lens instance is already running — stop it first',
      );
      process.exit(1);
    }
  }

  fs.writeFileSync(LOCK_PATH, String(process.pid));
  logger.debug({ pid: process.pid, lockPath: LOCK_PATH }, 'Instance lock acquired');

  const release = () => {
    try {
      if (fs.existsSync(LOCK_PATH) && readLockPidFromDisk() === process.pid) {
        fs.unlinkSync(LOCK_PATH);
      }
    } catch {
      // ignore
    }
  };

  process.on('exit', release);
  process.on('SIGINT', release);
  process.on('SIGTERM', release);
}

export function getInstanceLockPath(): string {
  return LOCK_PATH;
}
