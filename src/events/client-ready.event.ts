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

    const services = client.services;
    if (services) {
      const guilds = [...readyClient.guilds.cache.values()].map((guild) => ({
        id: guild.id,
        name: guild.name,
        memberCount: guild.memberCount,
      }));

      await services.telemetryService.emit('bot_ready', {
        guildCount: readyClient.guilds.cache.size,
        guilds,
        domains: services.domainBlocklistService.getGlobalDomainCount(),
        referenceImageHashes: services.phashService.getHashCounts().global,
      });
    }
  },
};

export default ClientReadyEvent;
