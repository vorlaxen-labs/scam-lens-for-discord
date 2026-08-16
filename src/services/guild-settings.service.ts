import { scamConfig } from '../config/index.js';
import { GuildSettingsRepository } from '../infra/database/repositories/guild-settings.repository.js';
import type { ActionMode, GuildSettings } from '../shared/types/index.js';

export class GuildSettingsService {
  constructor(private readonly repository: GuildSettingsRepository) {}

  getOrCreate(guildId: string): GuildSettings {
    const existing = this.repository.findByGuildId(guildId);
    if (existing) return existing;

    const settings: GuildSettings = {
      guildId,
      logChannelId: null,
      phashThreshold: scamConfig.phashThreshold,
      phashStrictThreshold: scamConfig.phashStrictThreshold,
      actionMode: 2 as ActionMode,
      enabled: true,
      exemptRoleIds: [],
      skipWebhooks: false,
      skipBots: true,
      timeoutDurationSeconds: 3600,
      quarantineFuzzyImages: true,
      quarantineDurationSeconds: 900,
    };

    return this.repository.create(settings);
  }

  update(settings: GuildSettings): GuildSettings {
    return this.repository.update(settings);
  }
}
