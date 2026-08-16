import { loadEnv } from '../shared/utils/load-env.util.js';
import { EnvUtils } from '../shared/utils/env.util.js';

loadEnv();

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
  logChannelId: process.env.LOG_CHANNEL_ID || null,
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
  copyright: '© Vorlaxen',
  footerText: 'Scam Lens by Vorlaxen',
} as const;

export const redisConfig = {
  enabled: EnvUtils.bool('REDIS_ENABLED', false),
  host: EnvUtils.string('REDIS_HOST', '127.0.0.1'),
  port: EnvUtils.number('REDIS_PORT', 6379),
  password: process.env.REDIS_PASSWORD || undefined,
  db: EnvUtils.number('REDIS_DB', 0),
  prefix: EnvUtils.string('REDIS_PREFIX', 'scam-lens:'),
} as const;
