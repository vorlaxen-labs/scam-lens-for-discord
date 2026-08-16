import fs from 'node:fs';
import path from 'node:path';
import { logger } from '../logger/index.js';

const LOCK_PATH = path.resolve(process.cwd(), 'data/scam-lens.pid');

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function acquireSingleInstanceLock(): void {
  fs.mkdirSync(path.dirname(LOCK_PATH), { recursive: true });

  if (fs.existsSync(LOCK_PATH)) {
    const raw = fs.readFileSync(LOCK_PATH, 'utf8').trim();
    const existingPid = Number(raw);
    if (existingPid && isProcessAlive(existingPid)) {
      logger.error(
        { pid: existingPid, lockPath: LOCK_PATH },
        'Another Scam Lens instance is already running — stop it first',
      );
      process.exit(1);
    }
    logger.warn({ pid: raw }, 'Removing stale instance lock');
    fs.unlinkSync(LOCK_PATH);
  }

  fs.writeFileSync(LOCK_PATH, String(process.pid));
  logger.debug({ pid: process.pid }, 'Instance lock acquired');

  const release = () => {
    try {
      if (fs.existsSync(LOCK_PATH)) {
        const current = fs.readFileSync(LOCK_PATH, 'utf8').trim();
        if (current === String(process.pid)) {
          fs.unlinkSync(LOCK_PATH);
        }
      }
    } catch {
      // ignore
    }
  };

  process.on('exit', release);
  process.on('SIGINT', release);
  process.on('SIGTERM', release);
}
