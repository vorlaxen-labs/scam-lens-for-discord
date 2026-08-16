import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ScamLensClient } from './client.js';
import type { BotEvent } from '../../shared/types/index.js';
import { logger } from '../logger/index.js';

async function collectEventFiles(directory: string): Promise<string[]> {
  if (!fs.existsSync(directory)) return [];

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectEventFiles(fullPath)));
      continue;
    }
    if (/\.event\.(ts|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

function registerEvent(client: ScamLensClient, event: BotEvent): void {
  const existing = client.eventHandlerRefs.get(event.name);
  if (existing) {
    client.off(event.name, existing);
  }

  const handler = (...args: unknown[]) => {
    void event.execute(...(args as Parameters<typeof event.execute>));
  };

  client.eventHandlerRefs.set(event.name, handler);

  if (event.once) {
    client.once(event.name, handler);
  } else {
    client.on(event.name, handler);
  }
}

export async function loadEvents(client: ScamLensClient): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const eventsDir = path.resolve(
    process.cwd(),
    isProd ? 'dist/events' : 'src/events',
  );

  const files = await collectEventFiles(eventsDir);
  for (const file of files) {
    const imported = await import(pathToFileURL(file).href);
    const event = (imported.default ?? imported) as BotEvent;
    registerEvent(client, event);
    logger.debug({ event: event.name }, 'Loaded event');
  }

  logger.info({ count: files.length }, 'Events loaded');
}
