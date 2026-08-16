import { describe, expect, it } from 'vitest';
import { CooldownService } from '../../src/services/cooldown.service.js';

describe('CooldownService', () => {
  it('returns remaining seconds when on cooldown', () => {
    const service = new CooldownService();
    expect(service.check('user1', 'ping', 5)).toBeNull();
    const remaining = service.check('user1', 'ping', 5);
    expect(remaining).toBeGreaterThan(0);
  });
});
