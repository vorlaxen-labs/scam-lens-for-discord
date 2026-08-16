import type {
  ChatInputCommandInteraction,
  ClientEvents,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  SlashCommandSubcommandsOnlyBuilder,
} from 'discord.js';

export interface CommandSettings {
  guildOnly?: boolean;
  ownerOnly?: boolean;
  manageGuildRequired?: boolean;
  administratorFallback?: boolean;
  cooldownSeconds?: number;
}

export interface BotCommand {
  name: string;
  description: string;
  settings?: CommandSettings;
  data:
    | SlashCommandBuilder
    | SlashCommandOptionsOnlyBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface BotEvent<T extends keyof ClientEvents = keyof ClientEvents> {
  name: T;
  once?: boolean;
  execute: (...args: ClientEvents[T]) => Promise<void> | void;
}

export type ActionMode = 0 | 1 | 2 | 3 | 4;

export type DetectionType = 'image' | 'domain' | 'dual';

export interface GuildSettings {
  guildId: string;
  logChannelId: string | null;
  phashThreshold: number;
  phashStrictThreshold: number;
  actionMode: ActionMode;
  enabled: boolean;
  exemptRoleIds: string[];
  skipWebhooks: boolean;
  skipBots: boolean;
  timeoutDurationSeconds: number;
  quarantineFuzzyImages: boolean;
  quarantineDurationSeconds: number;
}

export interface DomainMatch {
  domain: string;
  blockedDomain: string;
  source: string;
}

export interface ImageMatch {
  hash: string;
  matchedHash: string;
  hammingDistance: number;
  label: string | null;
  hashSource: string;
}

export interface ScanResult {
  domains: DomainMatch[];
  images: ImageMatch[];
}

export interface DetectionContext {
  operationId: string;
  guildId: string;
  userId: string;
  username: string;
  messageId: string;
  channelId: string;
  detectionType: DetectionType;
  matchedValue: string;
  hammingDistance: number | null;
  actionTaken: string;
  actionResult: string;
  metadataJson: string;
  domainMatches: DomainMatch[];
  imageMatches: ImageMatch[];
  phashThreshold: number;
  phashStrictThreshold: number;
  actionMode: ActionMode;
  trustScore: number;
}

export interface DetectionTechnicalContext extends DetectionEmbedContext {
  guildId: string;
  messageId: string;
  channelId: string;
  actionResult: string;
  actionMode: ActionMode;
  phashThreshold: number;
  phashStrictThreshold: number;
  domainMatches: DomainMatch[];
  imageMatches: ImageMatch[];
  metadataJson: string;
  trustScore: number;
}

export interface DetectionEmbedContext {
  operationId: string;
  userId: string;
  username: string;
  mention: string;
  type: DetectionType;
  match: string;
  action: string;
  distance?: number;
  guildName?: string;
  trustScore?: number;
}

export interface AboutEmbedContext {
  version: string;
  globalDomainCount: number;
  globalHashCount: number;
  guildCount: number;
  guild?: {
    enabled: boolean;
    actionMode: ActionMode;
    phashThreshold: number;
    phashStrictThreshold: number;
    customDomainCount: number;
    logChannelId: string | null;
    guildHashCount: number;
  };
}

export interface Services {
  guildSettingsService: import('../../services/guild-settings.service.js').GuildSettingsService;
  domainBlocklistService: import('../../services/domain-blocklist.service.js').DomainBlocklistService;
  phashService: import('../../services/phash.service.js').PhashService;
  scamDetectionService: import('../../services/scam-detection.service.js').ScamDetectionService;
  detectionLogService: import('../../services/detection-log.service.js').DetectionLogService;
  cooldownService: import('../../services/cooldown.service.js').CooldownService;
  messageDedupRepository: import('../../infra/database/repositories/message-dedup.repository.js').MessageDedupRepository;
}
