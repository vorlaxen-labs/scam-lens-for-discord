import { PermissionFlagsBits, PermissionsBitField } from 'discord.js';

export const BOT_INVITE_SCOPES = ['bot', 'applications.commands'] as const;

export const botInvitePermissions = new PermissionsBitField([
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
]);

export function buildBotInviteUrl(clientId: string, permissions = botInvitePermissions): string {
  const params = new URLSearchParams({
    client_id: clientId,
    permissions: permissions.bitfield.toString(),
    scope: BOT_INVITE_SCOPES.join(' '),
    integration_type: '0',
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
