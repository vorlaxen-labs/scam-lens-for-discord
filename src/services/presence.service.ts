import { ActivityType, type Client } from 'discord.js';
import { brandingConfig, presenceConfig } from '../config/index.js';
import { logger } from '../infra/logger/index.js';
import { resolveBotInviteUrl } from './application-install.service.js';

const GATEWAY_OPCODE_PRESENCE_UPDATE = 3;

export interface PresenceStats {
  guildCount: number;
  globalDomainCount: number;
  globalHashCount: number;
}

export interface PresenceActivityButton {
  label: string;
  url: string;
}

export interface PresenceSlide {
  type: ActivityType;
  name: string;
  details?: string;
  state?: string;
  buttons?: PresenceActivityButton[];
}

export function buildPresenceSlides(stats: PresenceStats, inviteUrl: string): PresenceSlide[] {
  const guildLabel = stats.guildCount.toLocaleString('en-US');
  const domainLabel = stats.globalDomainCount.toLocaleString('en-US');
  const hashLabel = stats.globalHashCount.toLocaleString('en-US');
  const serverWord = stats.guildCount === 1 ? 'server' : 'servers';
  const promoButtons: PresenceActivityButton[] = [
    { label: 'Add to Server', url: inviteUrl },
    { label: 'GitHub', url: brandingConfig.githubUrl },
  ];

  return [
    {
      type: ActivityType.Playing,
      name: brandingConfig.projectName,
      details: 'Scam images & malicious domains',
      state: 'Open-source protection for Discord',
      buttons: promoButtons,
    },
    {
      type: ActivityType.Watching,
      name: `${guildLabel} ${serverWord}`,
      state: 'Try /about · MIT license',
      buttons: promoButtons,
    },
    {
      type: ActivityType.Watching,
      name: `${domainLabel} blocked domains`,
      state: `${hashLabel} reference image hashes`,
      buttons: promoButtons,
    },
    {
      type: ActivityType.Listening,
      name: 'your community',
      state: 'pHash + blocklist · tune with /config',
      buttons: promoButtons,
    },
    {
      type: ActivityType.Competing,
      name: 'Discord scams',
      state: 'Free on GitHub — fork & self-host',
      buttons: promoButtons,
    },
  ];
}

function broadcastPresence(client: Client, activity: PresenceSlide): void {
  const manager = client.ws as unknown as {
    broadcast: (packet: { op: number; d: Record<string, unknown> }) => void;
  };

  manager.broadcast({
    op: GATEWAY_OPCODE_PRESENCE_UPDATE,
    d: {
      activities: [activity],
      afk: false,
      since: null,
      status: 'online',
    },
  });
}

export class PresenceService {
  private interval: ReturnType<typeof setInterval> | null = null;
  private slideIndex = 0;

  constructor(
    private readonly client: Client,
    private readonly getStats: () => PresenceStats,
  ) {}

  start(): void {
    if (!presenceConfig.enabled || this.interval) return;

    this.applySlide();
    this.interval = setInterval(() => this.applySlide(), presenceConfig.rotateIntervalMs);
    logger.debug('Rich presence rotation started');
  }

  stop(): void {
    if (!this.interval) return;

    clearInterval(this.interval);
    this.interval = null;
    logger.debug('Rich presence rotation stopped');
  }

  private applySlide(): void {
    if (!this.client.user) return;

    const slides = buildPresenceSlides(this.getStats(), resolveBotInviteUrl());
    const slide = slides[this.slideIndex % slides.length]!;
    this.slideIndex += 1;

    try {
      broadcastPresence(this.client, slide);
    } catch (error) {
      logger.debug({ error }, 'Failed to update rich presence');
    }
  }
}
