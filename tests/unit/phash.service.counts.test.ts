import { describe, expect, it } from 'vitest';
import { PhashService } from '../../src/services/phash.service.js';

describe('PhashService hash inventory', () => {
  const service = new PhashService();
  const records = [
    { id: 1, guildId: null, hash: 'aaaaaaaaaaaaaaaa', label: 'global', source: 'seed' },
    { id: 2, guildId: null, hash: 'bbbbbbbbbbbbbbbb', label: 'global-2', source: 'seed' },
    { id: 3, guildId: 'guild-1', hash: 'cccccccccccccccc', label: 'guild', source: 'command' },
    { id: 4, guildId: 'guild-2', hash: 'dddddddddddddddd', label: 'other', source: 'command' },
  ];

  it('counts global and guild hash records', () => {
    service.setHashRecords(records);
    expect(service.getHashCounts()).toEqual({ global: 2, guildEntries: 2 });
    expect(service.countForGuild('guild-1')).toBe(3);
    expect(service.countForGuild('guild-2')).toBe(3);
  });

  it('refreshes hash records in place', () => {
    service.setHashRecords(records.slice(0, 1));
    service.refreshHashRecords(records);
    expect(service.getHashCounts()).toEqual({ global: 2, guildEntries: 2 });
  });
});
