import { describe, expect, it } from 'vitest';
import {
  ActionFlag,
  actionModeIncludes,
  describeActionModeFlags,
  formatActionMode,
  getActionFlags,
  isLogOnlyMode,
  normalizeActionMode,
} from '../../src/shared/utils/action-mode.util.js';
import { shouldApplyTimeout } from '../../src/services/scam-detection.service.js';

describe('action-mode.util', () => {
  it('maps preset modes to delete/ban flags only', () => {
    expect(getActionFlags(0)).toBe(ActionFlag.DELETE | ActionFlag.BAN);
    expect(getActionFlags(1)).toBe(ActionFlag.DELETE);
    expect(getActionFlags(2)).toBe(0);
  });

  it('normalizes legacy action modes 3 and 4', () => {
    expect(normalizeActionMode(3)).toBe(1);
    expect(normalizeActionMode(4)).toBe(0);
  });

  it('checks included actions per mode', () => {
    expect(actionModeIncludes(0, ActionFlag.BAN)).toBe(true);
    expect(actionModeIncludes(1, ActionFlag.BAN)).toBe(false);
    expect(isLogOnlyMode(2)).toBe(true);
  });

  it('formats mode labels', () => {
    expect(formatActionMode(1)).toContain('Delete + log');
    expect(describeActionModeFlags(0)).toBe('delete + ban + log');
    expect(describeActionModeFlags(2)).toBe('log');
  });
});

describe('shouldApplyTimeout', () => {
  it('applies timeout when enabled and ban is not used', () => {
    expect(shouldApplyTimeout(true, false)).toBe(true);
    expect(shouldApplyTimeout(true, true)).toBe(false);
    expect(shouldApplyTimeout(false, false)).toBe(false);
  });
});
