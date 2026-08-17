import { describe, expect, it } from 'vitest';
import { PermissionFlagsBits } from 'discord.js';
import { buildBotInviteUrl, botInvitePermissions } from '../../src/shared/utils/invite.util.js';

describe('buildBotInviteUrl', () => {
  it('builds guild-install OAuth URL with required scopes and permissions', () => {
    const url = new URL(buildBotInviteUrl('123456789'));

    expect(url.origin + url.pathname).toBe('https://discord.com/oauth2/authorize');
    expect(url.searchParams.get('client_id')).toBe('123456789');
    expect(url.searchParams.get('scope')).toBe('bot applications.commands');
    expect(url.searchParams.get('integration_type')).toBe('0');
    expect(url.searchParams.get('permissions')).toBe(botInvitePermissions.bitfield.toString());
  });

  it('includes moderation permissions needed by the bot', () => {
    expect(botInvitePermissions.has(PermissionFlagsBits.ManageMessages)).toBe(true);
    expect(botInvitePermissions.has(PermissionFlagsBits.BanMembers)).toBe(true);
    expect(botInvitePermissions.has(PermissionFlagsBits.ModerateMembers)).toBe(true);
  });
});
