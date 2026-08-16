import { describe, expect, it } from 'vitest';
import {
  ActionFlag,
  actionModeIncludes,
  describeActionModeFlags,
  formatActionMode,
  getActionFlags,
  isLogOnlyMode,
} from '../../src/shared/utils/action-mode.util.js';
import { resolveModerationActionTaken } from '../../src/services/scam-detection.service.js';

describe('action-mode.util', () => {
  it('maps preset modes to combinable flags', () => {
    expect(getActionFlags(0)).toBe(ActionFlag.DELETE | ActionFlag.BAN);
    expect(getActionFlags(1)).toBe(ActionFlag.DELETE);
    expect(getActionFlags(2)).toBe(0);
    expect(getActionFlags(3)).toBe(ActionFlag.DELETE | ActionFlag.TIMEOUT);
    expect(getActionFlags(4)).toBe(ActionFlag.DELETE | ActionFlag.BAN | ActionFlag.TIMEOUT);
  });

  it('checks included actions per mode', () => {
    expect(actionModeIncludes(3, ActionFlag.TIMEOUT)).toBe(true);
    expect(actionModeIncludes(3, ActionFlag.BAN)).toBe(false);
    expect(actionModeIncludes(4, ActionFlag.BAN)).toBe(true);
    expect(actionModeIncludes(4, ActionFlag.TIMEOUT)).toBe(true);
    expect(isLogOnlyMode(2)).toBe(true);
    expect(isLogOnlyMode(1)).toBe(false);
  });

  it('formats mode labels and flag descriptions', () => {
    expect(formatActionMode(4)).toContain('timeout, then ban');
    expect(describeActionModeFlags(4)).toBe('delete + ban + timeout + log');
    expect(describeActionModeFlags(2)).toBe('log');
  });
});

describe('resolveModerationActionTaken', () => {
  it('reports combined ban and timeout outcomes', () => {
    expect(resolveModerationActionTaken(true, true, true, true)).toBe('timeout+ban');
    expect(resolveModerationActionTaken(true, true, false, true)).toBe('timeout+ban_partial');
    expect(resolveModerationActionTaken(true, true, true, false)).toBe('timeout_partial+ban');
    expect(resolveModerationActionTaken(true, false, true, null)).toBe('ban');
    expect(resolveModerationActionTaken(false, true, null, true)).toBe('timeout');
  });
});
