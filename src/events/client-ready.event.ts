import { Events } from 'discord.js';
import { brandingConfig } from '../config/index.js';
import type { BotEvent } from '../shared/types/index.js';
import { client } from '../infra/bot/client.js';
import { syncApplicationInstall } from '../services/application-install.service.js';
import { logger } from '../infra/logger/index.js';

const ClientReadyEvent: BotEvent<typeof Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  async execute(readyClient) {
    logger.info(
      { tag: readyClient.user?.tag, guilds: readyClient.guilds.cache.size },
      `${brandingConfig.projectName} ready`,
    );

    await syncApplicationInstall(readyClient);
    client.services?.presenceService.start();
  },
};

export default ClientReadyEvent;
