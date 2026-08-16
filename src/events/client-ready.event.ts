import { Events } from 'discord.js';
import { brandingConfig } from '../config/index.js';
import type { BotEvent } from '../shared/types/index.js';
import { logger } from '../infra/logger/index.js';

const ClientReadyEvent: BotEvent<typeof Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.info(
      { tag: client.user?.tag, guilds: client.guilds.cache.size },
      `${brandingConfig.projectName} ready`,
    );
  },
};

export default ClientReadyEvent;
