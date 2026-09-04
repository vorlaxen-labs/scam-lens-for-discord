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
  readonly eventHandlerRefs = new Map<string, (...args: unknown[]) => void>();
  private started = false;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
      partials: [Partials.Channel, Partials.Message],
    });

    this.on('error', (error) => logger.error({ error }, 'Discord client error'));
    this.on('warn', (message) => logger.warn({ message }, 'Discord client warning'));
  }

  async start(token: string, services: Services): Promise<void> {
    if (this.started) {
      logger.warn('Client already started — skipping duplicate bootstrap');
      this.services = services;
      return;
    }
    this.started = true;

    this.services = services;
    await loadEvents(this);
    await loadCommands(this);
    await deployCommands(this);
    await this.login(token);
  }
}

export const client = new ScamLensClient();
