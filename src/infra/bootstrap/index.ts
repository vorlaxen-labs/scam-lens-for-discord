import { brandingConfig } from '../../config/index.js';
import { DatabaseService } from '../database/connection.js';
import { client } from '../bot/client.js';
import { botConfig } from '../../config/index.js';
import { createServices, refreshRuntimeCaches } from './create-services.js';
import { runSeed } from './seed.js';
import { acquireSingleInstanceLock } from './single-instance.js';
import { logger } from '../logger/index.js';

function registerSignals(database: DatabaseService): void {
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    client.destroy();
    database.close();
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

export async function bootstrap(): Promise<void> {
  acquireSingleInstanceLock();

  const database = DatabaseService.getInstance();
  database.initialize();

  const services = createServices(client);
  await runSeed(services.phashService);
  refreshRuntimeCaches(services);
  client.services = services;

  logger.info(
    {
      project: brandingConfig.projectName,
      author: brandingConfig.author,
      domains: services.domainBlocklistService.getGlobalDomainCount(),
    },
    `${brandingConfig.projectName} starting`,
  );

  registerSignals(database);
  await client.start(botConfig.token, services);

  logger.info(`${brandingConfig.projectName} is online`);
}

bootstrap().catch((error) => {
  logger.error({ error }, 'Bootstrap failed');
  process.exit(1);
});
