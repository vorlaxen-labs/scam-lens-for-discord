import { AuditLogEvent, Events } from 'discord.js';
import type { BotEvent } from '../shared/types/index.js';
import { client } from '../infra/bot/client.js';

const GuildCreateEvent: BotEvent<typeof Events.GuildCreate> = {
  name: Events.GuildCreate,
  async execute(guild) {
    const services = client.services;
    if (!services) return;

    const owner = await guild.fetchOwner().catch(() => null);
    const auditLogs = await guild
      .fetchAuditLogs({ limit: 6, type: AuditLogEvent.BotAdd })
      .catch(() => null);
    const botAddEntry = auditLogs?.entries.find(
      (entry) => entry.targetId === client.user?.id && Date.now() - entry.createdTimestamp < 60_000,
    );

    await services.telemetryService.emit('guild_join', {
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      ownerId: owner?.id ?? null,
      ownerTag: owner?.user.tag ?? null,
      addedById: botAddEntry?.executor?.id ?? null,
      addedByTag: botAddEntry?.executor?.tag ?? null,
    });
  },
};

export default GuildCreateEvent;
