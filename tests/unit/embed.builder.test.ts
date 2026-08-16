import { describe, expect, it } from 'vitest';
import { EmbedBuilder } from '../../src/shared/embed/embed.builder.js';

describe('EmbedBuilder', () => {
  it('limits detection embed to two fields', () => {
    const embed = EmbedBuilder.detection({
      operationId: 'SL-01TEST',
      userId: '1',
      username: 'user',
      mention: '<@1>',
      type: 'domain',
      match: 'evil.com',
      action: 'delete',
    });
    expect(embed.fields?.length).toBeLessThanOrEqual(2);
    expect(embed.title).toBe('SL-01TEST');
  });
});
