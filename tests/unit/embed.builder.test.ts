import { describe, expect, it } from 'vitest';
import { EmbedBuilder } from '../../src/shared/embed/embed.builder.js';

describe('EmbedBuilder', () => {
  it('formats detection embed with structured fields', () => {
    const embed = EmbedBuilder.detection({
      operationId: 'SL-01TEST',
      userId: '885902148284604487',
      username: 'quasarmind',
      mention: '<@885902148284604487>',
      type: 'image',
      match: 'c03f3f9080fede18',
      action: 'log',
      distance: 0,
      guildName: 'Vorlaxen Labs',
    });

    expect(embed.title).toBe('Scam Detected');
    expect(embed.description).toContain('SL-01TEST');
    expect(embed.fields?.length).toBe(4);
    expect(embed.fields?.[0]?.name).toBe('User');
    expect(embed.fields?.[2]?.value).toBe('Log only');
    expect(embed.fields?.[3]?.name).toBe('Image');
    expect(embed.fields?.[3]?.value).toContain('Exact match');
  });

  it('formats technical detection embed with pHash and reference details', () => {
    const embed = EmbedBuilder.detectionTechnical({
      operationId: 'SL-TECH01',
      userId: '885902148284604487',
      username: 'quasarmind',
      mention: '<@885902148284604487>',
      type: 'image',
      match: 'c03f3f9080fede18',
      action: 'delete',
      distance: 2,
      trustScore: 72,
      guildName: 'Vorlaxen Labs',
      guildId: '1412898757527207968',
      messageId: '1234567890',
      channelId: '9876543210',
      actionResult: 'delete:success',
      actionMode: 1,
      phashThreshold: 8,
      phashStrictThreshold: 3,
      domainMatches: [],
      imageMatches: [
        {
          hash: 'aabbccddeeff0011',
          matchedHash: 'c03f3f9080fede18',
          hammingDistance: 2,
          label: '4.webp',
          hashSource: 'seed',
        },
      ],
      metadataJson: JSON.stringify({
        contentPreview: 'check this out',
        attachments: [{ url: 'https://cdn.discordapp.com/test.png', name: 'test.png' }],
      }),
    });

    expect(embed.title).toBe('Scam Detected · Technical Report');
    const phashField = embed.fields?.find((field) => field.name === 'pHash Analysis');
    expect(phashField?.value).toContain('4.webp');
    expect(phashField?.value).toContain('seed');
    expect(phashField?.value).toContain('Hamming distance:** 2');
    expect(phashField?.value).toContain('aabbccddeeff0011');
    expect(phashField?.value).toContain('c03f3f9080fede18');
  });

  it('formats detailed about embed with stats and guild settings', () => {
    const embed = EmbedBuilder.about({
      version: '0.1.0',
      globalDomainCount: 21903,
      globalHashCount: 12,
      guildCount: 3,
      guild: {
        enabled: true,
        actionMode: 1,
        phashThreshold: 8,
        phashStrictThreshold: 3,
        customDomainCount: 2,
        logChannelId: '1538466257110564884',
        guildHashCount: 14,
      },
    });

    expect(embed.title).toBe('Scam Lens For Discord');
    expect(embed.description).toContain('Open-source');
    expect(embed.fields?.find((field) => field.name === 'Detection')?.value).toContain('perceptual hash');
    expect(embed.fields?.find((field) => field.name === 'Database')?.value).toContain('21,903');
    expect(embed.fields?.find((field) => field.name === 'This Server')?.value).toContain('Enabled');
    expect(embed.footer?.text).toContain('v0.1.0');
  });

  it('formats telemetry embed with event footer', () => {
    const embed = EmbedBuilder.telemetry({
      event: 'guild_join',
      title: 'Bot joined server',
      fields: [
        { name: 'Server', value: '**Test** (`123`)', inline: false },
        { name: 'Members', value: '42', inline: true },
      ],
    });

    expect(embed.title).toBe('📡 Bot joined server');
    expect(embed.fields).toHaveLength(2);
    expect(embed.footer?.text).toContain('telemetry · guild_join');
  });
});
