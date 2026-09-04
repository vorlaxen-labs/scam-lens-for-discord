import { ActivityType } from 'discord.js';
import { describe, expect, it } from 'vitest';
import { buildPresenceSlides } from '../../src/services/presence.service.js';

const inviteUrl = 'https://discord.com/oauth2/authorize?client_id=123';

describe('buildPresenceSlides', () => {
  it('returns promotional slides with live stats and invite buttons', () => {
    const slides = buildPresenceSlides(
      {
        guildCount: 42,
        globalDomainCount: 21_908,
        globalHashCount: 128,
      },
      inviteUrl,
    );

    expect(slides).toHaveLength(5);
    expect(slides[0]).toMatchObject({
      type: ActivityType.Playing,
      details: 'Scam images & malicious domains',
      state: 'Open-source protection for Discord',
    });
    expect(slides[0]?.buttons).toEqual([
      { label: 'Add to Server', url: inviteUrl },
      { label: 'GitHub', url: expect.stringContaining('github.com') },
    ]);
    expect(slides[1]?.name).toBe('42 servers');
    expect(slides[2]?.name).toBe('21,908 blocked domains');
    expect(slides[2]?.state).toBe('128 reference image hashes');
    expect(slides[4]?.type).toBe(ActivityType.Competing);
  });

  it('uses singular server label for one guild', () => {
    const slides = buildPresenceSlides(
      {
        guildCount: 1,
        globalDomainCount: 100,
        globalHashCount: 10,
      },
      inviteUrl,
    );

    expect(slides[1]?.name).toBe('1 server');
  });
});
