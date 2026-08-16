import { REST, Routes } from 'discord.js';
import { botConfig } from '../../config/index.js';
import type { ScamLensClient } from './client.js';
import { getSlashCommands } from './command-loader.js';
import { logger } from '../logger/index.js';

async function putWithRetry(
  rest: REST,
  route: `/${string}`,
  body: unknown,
  label: string,
  attempts = 3,
): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await rest.put(route, { body });
      return;
    } catch (error) {
      lastError = error;
      logger.warn({ error, attempt, label }, 'Command deploy attempt failed');
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 2000));
      }
    }
  }
  throw lastError;
}

export async function deployCommands(client: ScamLensClient): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(botConfig.token);
  const body = getSlashCommands(client);
  const globalRoute = Routes.applicationCommands(botConfig.clientId);

  // Dev: guild-scoped commands (instant). Clear global only after guild succeeds.
  if (botConfig.guildId) {
    const guildRoute = Routes.applicationGuildCommands(botConfig.clientId, botConfig.guildId);

    try {
      await putWithRetry(rest, guildRoute, body, 'guild');
      await putWithRetry(rest, globalRoute, [], 'global-clear');
      logger.info(
        { guildId: botConfig.guildId, count: body.length },
        'Guild slash commands deployed (global cleared)',
      );
      return;
    } catch (error) {
      logger.warn(
        { error, guildId: botConfig.guildId },
        'Guild deploy failed — keeping existing guild commands, deploying global',
      );
    }
  }

  try {
    await putWithRetry(rest, globalRoute, body, 'global');
    logger.info({ count: body.length }, 'Global slash commands deployed');
  } catch (error) {
    logger.error({ error }, 'All command deploy attempts failed');
  }
}
