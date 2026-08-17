import { afterEach, describe, expect, it, vi } from 'vitest';

describe('shouldUseGuildCommandDeploy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('uses guild deploy in development when BOT_GUILD_ID is set', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('BOT_GUILD_ID', '1412898757527207968');

    const { shouldUseGuildCommandDeploy } = await import('../../src/infra/bot/command-deploy.js');

    expect(shouldUseGuildCommandDeploy()).toBe(true);
  });

  it('uses global deploy in production even when BOT_GUILD_ID is set', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('BOT_GUILD_ID', '1412898757527207968');

    const { shouldUseGuildCommandDeploy } = await import('../../src/infra/bot/command-deploy.js');

    expect(shouldUseGuildCommandDeploy()).toBe(false);
  });

  it('uses global deploy when BOT_GUILD_ID is unset', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('BOT_GUILD_ID', '');

    const { shouldUseGuildCommandDeploy } = await import('../../src/infra/bot/command-deploy.js');

    expect(shouldUseGuildCommandDeploy()).toBe(false);
  });
});
