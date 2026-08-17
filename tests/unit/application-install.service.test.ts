import { OAuth2Scopes, PermissionFlagsBits, PermissionsBitField } from 'discord.js';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('buildApplicationInstallEditPayload', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses installParams when BOT_INVITE_URL is unset', async () => {
    vi.stubEnv('BOT_INVITE_URL', '');
    vi.stubEnv('BOT_CLIENT_ID', '1538177155316322445');
    const { buildApplicationInstallEditPayload } = await import(
      '../../src/services/application-install.service.js'
    );

    const payload = buildApplicationInstallEditPayload();

    expect(payload).toEqual({
      installParams: {
        scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
        permissions: expect.any(PermissionsBitField),
      },
    });
    expect(payload).not.toHaveProperty('customInstallURL');
  });

  it('never sends mutually exclusive install fields together', async () => {
    vi.stubEnv('BOT_INVITE_URL', '');
    const { buildApplicationInstallEditPayload } = await import(
      '../../src/services/application-install.service.js'
    );

    const payload = buildApplicationInstallEditPayload();
    const keys = Object.keys(payload);

    expect(keys).not.toContain('customInstallURL');
    expect(keys).toEqual(['installParams']);
  });

  it('uses customInstallURL when BOT_INVITE_URL is set', async () => {
    vi.stubEnv('BOT_INVITE_URL', 'https://discord.com/oauth2/authorize?client_id=1');
    const { buildApplicationInstallEditPayload } = await import(
      '../../src/services/application-install.service.js'
    );

    const payload = buildApplicationInstallEditPayload();

    expect(payload).toEqual({
      customInstallURL: 'https://discord.com/oauth2/authorize?client_id=1',
    });
    expect(payload).not.toHaveProperty('installParams');
  });

  it('includes moderation permissions in installParams', async () => {
    vi.stubEnv('BOT_INVITE_URL', '');
    const { buildApplicationInstallEditPayload } = await import(
      '../../src/services/application-install.service.js'
    );

    const payload = buildApplicationInstallEditPayload();
    if (!('installParams' in payload)) {
      throw new Error('Expected installParams payload');
    }

    expect(payload.installParams.permissions.has(PermissionFlagsBits.ManageMessages)).toBe(true);
    expect(payload.installParams.permissions.has(PermissionFlagsBits.BanMembers)).toBe(true);
    expect(payload.installParams.permissions.has(PermissionFlagsBits.ModerateMembers)).toBe(true);
  });
});

describe('resolveBotInviteUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('builds the default invite url from BOT_CLIENT_ID', async () => {
    vi.stubEnv('BOT_CLIENT_ID', '1538177155316322445');
    vi.stubEnv('BOT_INVITE_URL', '');

    const { resolveBotInviteUrl } = await import('../../src/services/application-install.service.js');
    const url = new URL(resolveBotInviteUrl());

    expect(url.searchParams.get('client_id')).toBe('1538177155316322445');
    expect(url.searchParams.get('scope')).toBe('bot applications.commands');
    expect(url.searchParams.get('integration_type')).toBe('0');
  });

  it('returns BOT_INVITE_URL override verbatim', async () => {
    vi.stubEnv(
      'BOT_INVITE_URL',
      'https://discord.com/oauth2/authorize?client_id=override&permissions=1',
    );

    const { resolveBotInviteUrl } = await import('../../src/services/application-install.service.js');

    expect(resolveBotInviteUrl()).toBe(
      'https://discord.com/oauth2/authorize?client_id=override&permissions=1',
    );
  });
});

describe('syncApplicationInstall', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  function createClientMock() {
    return {
      application: {
        fetch: vi.fn().mockResolvedValue(undefined),
        edit: vi.fn().mockResolvedValue(undefined),
      },
      rest: {
        patch: vi.fn().mockResolvedValue(undefined),
      },
    };
  }

  it('skips sync when INSTALL_SYNC_ENABLED is false', async () => {
    vi.stubEnv('INSTALL_SYNC_ENABLED', 'false');
    const client = createClientMock();
    const { syncApplicationInstall } = await import('../../src/services/application-install.service.js');

    await syncApplicationInstall(client as never);

    expect(client.application.fetch).not.toHaveBeenCalled();
    expect(client.application.edit).not.toHaveBeenCalled();
    expect(client.rest.patch).not.toHaveBeenCalled();
  });

  it('patches install settings with mutually exclusive application.edit payload', async () => {
    vi.stubEnv('INSTALL_SYNC_ENABLED', 'true');
    vi.stubEnv('BOT_INVITE_URL', '');
    vi.stubEnv('BOT_CLIENT_ID', '1538177155316322445');

    const client = createClientMock();
    const { syncApplicationInstall, buildApplicationInstallEditPayload } = await import(
      '../../src/services/application-install.service.js'
    );

    await syncApplicationInstall(client as never);

    expect(client.application.edit).toHaveBeenCalledTimes(1);
    expect(client.application.edit).toHaveBeenCalledWith(buildApplicationInstallEditPayload());

    const editArg = client.application.edit.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(Object.keys(editArg)).not.toEqual(
      expect.arrayContaining(['customInstallURL', 'installParams']),
    );
  });

  it('syncs guild-install integration_types_config separately', async () => {
    vi.stubEnv('INSTALL_SYNC_ENABLED', 'true');
    vi.stubEnv('BOT_INVITE_URL', '');
    const client = createClientMock();
    const { syncApplicationInstall } = await import('../../src/services/application-install.service.js');
    const { botInvitePermissions } = await import('../../src/shared/utils/invite.util.js');

    await syncApplicationInstall(client as never);

    expect(client.rest.patch).toHaveBeenCalledWith('/applications/@me', {
      body: {
        integration_types_config: {
          '0': {
            oauth2_install_params: {
              scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
              permissions: botInvitePermissions.bitfield.toString(),
            },
          },
        },
      },
    });
  });

  it('uses customInstallURL only when BOT_INVITE_URL override is configured', async () => {
    vi.stubEnv('INSTALL_SYNC_ENABLED', 'true');
    vi.stubEnv('BOT_INVITE_URL', 'https://discord.com/oauth2/authorize?client_id=custom');

    const client = createClientMock();
    const { syncApplicationInstall } = await import('../../src/services/application-install.service.js');

    await syncApplicationInstall(client as never);

    expect(client.application.edit).toHaveBeenCalledWith({
      customInstallURL: 'https://discord.com/oauth2/authorize?client_id=custom',
    });
  });

  it('swallows discord api failures without throwing', async () => {
    vi.stubEnv('INSTALL_SYNC_ENABLED', 'true');
    const client = createClientMock();
    client.application.edit.mockRejectedValue(new Error('Invalid Form Body'));

    const { syncApplicationInstall } = await import('../../src/services/application-install.service.js');

    await expect(syncApplicationInstall(client as never)).resolves.toBeUndefined();
  });
});
