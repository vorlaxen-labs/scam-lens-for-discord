import { OAuth2Scopes, type Client } from 'discord.js';
import { botConfig, installConfig } from '../config/index.js';
import { logger } from '../infra/logger/index.js';
import {
  botInvitePermissions,
  buildBotInviteUrl,
} from '../shared/utils/invite.util.js';

const BOT_INVITE_SCOPES = [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands] as const;

export function resolveBotInviteUrl(): string {
  return installConfig.inviteUrl ?? buildBotInviteUrl(botConfig.clientId);
}

export function buildApplicationInstallEditPayload():
  | { customInstallURL: string }
  | {
      installParams: {
        scopes: [...typeof BOT_INVITE_SCOPES];
        permissions: typeof botInvitePermissions;
      };
    } {
  if (installConfig.inviteUrl) {
    return { customInstallURL: installConfig.inviteUrl };
  }

  return {
    installParams: {
      scopes: [...BOT_INVITE_SCOPES],
      permissions: botInvitePermissions,
    },
  };
}

export async function syncApplicationInstall(client: Client<true>): Promise<void> {
  if (!installConfig.syncEnabled) return;

  const inviteUrl = resolveBotInviteUrl();
  const permissions = botInvitePermissions.bitfield.toString();

  try {
    await client.application.fetch();
    await client.application.edit(buildApplicationInstallEditPayload());

    await client.rest.patch('/applications/@me', {
      body: {
        integration_types_config: {
          '0': {
            oauth2_install_params: {
              scopes: [...BOT_INVITE_SCOPES],
              permissions,
            },
          },
        },
      },
    });

    logger.info({ inviteUrl }, 'Application install settings synced');
  } catch (error) {
    logger.warn({ error }, 'Failed to sync application install settings');
  }
}
