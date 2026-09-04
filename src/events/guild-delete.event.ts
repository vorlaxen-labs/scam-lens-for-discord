import { AuditLogEvent, Events } from 'discord.js';
import type { BotEvent } from '../shared/types/index.js';
import { client } from '../infra/bot/client.js';

const GuildDeleteEvent: BotEvent<typeof Events.GuildDelete> = {
  name: Events.GuildDelete,
  async execute(guild) {
    const services = client.services;
    if (!services) return;

    const auditLogs = await guild
      .fetchAuditLogs({ limit: 6, type: AuditLogEvent.MemberKick })
      .catch(() => null);
    const kickEntry = auditLogs?.entries.find(
      (entry) =>
        entry.targetId === client.user?.id && Date.now() - entry.createdTimestamp < 60_000,
    );

    await services.telemetryService.emit('guild_leave', {
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.memberCount,
      removedById: kickEntry?.executor?.id ?? null,
      removedByTag: kickEntry?.executor?.tag ?? null,
      reason: kickEntry?.reason ?? (guild.available === false ? 'Guild unavailable' : null),
    });
  },
};

export default GuildDeleteEvent;
