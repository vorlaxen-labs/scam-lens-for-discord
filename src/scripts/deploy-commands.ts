import { loadEnv } from '../shared/utils/load-env.util.js';
import { loadCommands } from '../infra/bot/command-loader.js';
import { client } from '../infra/bot/client.js';
import { deployCommands } from '../infra/bot/command-deploy.js';
import { logger } from '../infra/logger/index.js';

loadEnv();

async function main(): Promise<void> {
  await loadCommands(client);
  await deployCommands(client);
  logger.info('Manual command deploy finished');
}

main().catch((error) => {
  logger.error({ error }, 'Manual command deploy failed');
  process.exit(1);
});
