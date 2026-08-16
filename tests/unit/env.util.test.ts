import { describe, expect, it } from 'vitest';
import { EnvUtils } from '../../src/shared/utils/env.util.js';

describe('EnvUtils', () => {
  it('parses bool and array values', () => {
    process.env.TEST_BOOL = 'true';
    process.env.TEST_ARRAY = 'a,b,c';
    expect(EnvUtils.bool('TEST_BOOL')).toBe(true);
    expect(EnvUtils.array('TEST_ARRAY')).toEqual(['a', 'b', 'c']);
  });

  it('throws for missing required string', () => {
    expect(() => EnvUtils.string('DEFINITELY_MISSING_ENV_XYZ')).toThrow();
  });
});
