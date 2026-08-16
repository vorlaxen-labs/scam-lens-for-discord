import { REST, Routes } from 'discord.js';
import { botConfig } from '../../config/index.js';
import type { ScamLensClient } from './client.js';
import { getSlashCommands } from './command-loader.js';
import { logger } from '../logger/index.js';

export async function deployCommands(client: ScamLensClient): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(botConfig.token);
  const body = getSlashCommands(client);
  const globalRoute = Routes.applicationCommands(botConfig.clientId);

  if (botConfig.guildId) {
    const guildRoute = Routes.applicationGuildCommands(botConfig.clientId, botConfig.guildId);

    try {
      await rest.put(guildRoute, { body });
      await rest.put(globalRoute, { body: [] });
      logger.info(
        { guildId: botConfig.guildId, count: body.length },
        'Guild slash commands deployed (global cleared)',
      );
      return;
    } catch (error) {
      logger.warn(
        { error, guildId: botConfig.guildId },
        'Guild command deploy failed — falling back to global',
      );

      try {
        await rest.put(guildRoute, { body: [] });
      } catch {
        // guild may be unreachable; ignore
      }
    }
  }

  try {
    await rest.put(globalRoute, { body });
    logger.info({ count: body.length }, 'Global slash commands deployed');
  } catch (error) {
    logger.warn({ error }, 'Slash command deploy failed — bot will still start');
  }
}
