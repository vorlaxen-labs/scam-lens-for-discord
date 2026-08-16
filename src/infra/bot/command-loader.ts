import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ScamLensClient } from './client.js';
import type { BotCommand } from '../../shared/types/index.js';
import { logger } from '../logger/index.js';

async function collectCommandFiles(directory: string): Promise<string[]> {
  if (!fs.existsSync(directory)) return [];

  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectCommandFiles(fullPath)));
      continue;
    }
    if (/\.command\.(ts|js)$/.test(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function loadCommands(client: ScamLensClient): Promise<void> {
  const isProd = process.env.NODE_ENV === 'production';
  const commandsDir = path.resolve(
    process.cwd(),
    isProd ? 'dist/commands' : 'src/commands',
  );

  const files = await collectCommandFiles(commandsDir);
  for (const file of files) {
    const imported = await import(pathToFileURL(file).href);
    const command = (imported.default ?? imported) as BotCommand;
    client.commands.set(command.name, command);
    logger.debug({ command: command.name }, 'Loaded command');
  }

  logger.info({ count: client.commands.size }, 'Commands loaded');
}

export function getSlashCommands(client: ScamLensClient) {
  return [...client.commands.values()].map((command) => command.data.toJSON());
}
