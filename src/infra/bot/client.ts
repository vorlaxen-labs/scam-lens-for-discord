import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import type { BotCommand } from '../../shared/types/index.js';
import { loadCommands } from './command-loader.js';
import { loadEvents } from './event-loader.js';
import { deployCommands } from './command-deploy.js';
import { logger } from '../logger/index.js';
import type { Services } from '../../shared/types/index.js';

export class ScamLensClient extends Client {
  readonly commands = new Collection<string, BotCommand>();
  services: Services | null = null;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
      partials: [Partials.Channel],
    });

    this.on('error', (error) => logger.error({ error }, 'Discord client error'));
    this.on('warn', (message) => logger.warn({ message }, 'Discord client warning'));
  }

  async start(token: string, services: Services): Promise<void> {
    this.services = services;
    await loadEvents(this);
    await loadCommands(this);
    await deployCommands(this);
    await this.login(token);
  }
}

export const client = new ScamLensClient();
