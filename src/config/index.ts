import { createRequire } from 'node:module';
import { loadEnv } from '../shared/utils/load-env.util.js';
import { EnvUtils } from '../shared/utils/env.util.js';

loadEnv();

const require = createRequire(import.meta.url);
const { version: appVersion } = require('../../package.json') as { version: string };

export const botConfig = {
  token: EnvUtils.string('BOT_TOKEN'),
  clientId: EnvUtils.string('BOT_CLIENT_ID'),
  guildId: process.env.BOT_GUILD_ID || null,
  ownerIds: EnvUtils.array('OWNER_IDS'),
} as const;

export const scamConfig = {
  defaultActionMode: EnvUtils.number('SCAM_ACTION', 1),
  phashThreshold: EnvUtils.number('PHASH_THRESHOLD', 8),
  phashStrictThreshold: EnvUtils.number('PHASH_STRICT_THRESHOLD', 3),
  /** Central log hub — receives detections from every guild (main guild channel). */
  centralLogChannelId: process.env.LOG_CHANNEL_ID || null,
  timeoutDurationSeconds: EnvUtils.number('TIMEOUT_DURATION_SECONDS', 3600),
} as const;

export const databaseConfig = {
  path: EnvUtils.string('DATABASE_PATH', './data/scam-lens.db'),
} as const;

export const brandingConfig = {
  author: 'Vorlaxen',
  authorUrl: 'https://vorlaxen.com',
  projectName: 'Scam Lens For Discord',
  githubUrl: EnvUtils.string('GITHUB_REPO_URL', 'https://github.com/vorlaxen/scam-lens-discord-bot'),
  docsUrl: EnvUtils.string(
    'DOCS_URL',
    'https://github.com/vorlaxen/scam-lens-discord-bot/blob/main/docs/setup.md',
  ),
  copyright: '© Vorlaxen',
  footerText: 'Scam Lens by Vorlaxen',
} as const;

export const appConfig = {
  version: appVersion,
} as const;

export const presenceConfig = {
  enabled: EnvUtils.bool('PRESENCE_ENABLED', true),
  rotateIntervalMs: EnvUtils.number('PRESENCE_ROTATE_MS', 45_000),
} as const;

export const installConfig = {
  syncEnabled: EnvUtils.bool('INSTALL_SYNC_ENABLED', true),
  inviteUrl: process.env.BOT_INVITE_URL || null,
} as const;

export const telemetryConfig = {
  enabled: EnvUtils.bool('TELEMETRY_ENABLED', true),
  guildEvents: EnvUtils.bool('TELEMETRY_GUILD_EVENTS', true),
  commands: EnvUtils.bool('TELEMETRY_COMMANDS', false),
} as const;

export const redisConfig = {
  enabled: EnvUtils.bool('REDIS_ENABLED', false),
  host: EnvUtils.string('REDIS_HOST', '127.0.0.1'),
  port: EnvUtils.number('REDIS_PORT', 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: EnvUtils.number('REDIS_DB', 0),
  prefix: EnvUtils.string('REDIS_PREFIX', 'scam-lens:'),
} as const;
