export const ActionFlag = {
  DELETE: 1,
  BAN: 2,
  TIMEOUT: 4,
} as const;

export type ActionMode = 0 | 1 | 2 | 3 | 4;

const ACTION_MODE_FLAGS: Record<ActionMode, number> = {
  0: ActionFlag.DELETE | ActionFlag.BAN,
  1: ActionFlag.DELETE,
  2: 0,
  3: ActionFlag.DELETE | ActionFlag.TIMEOUT,
  4: ActionFlag.DELETE | ActionFlag.BAN | ActionFlag.TIMEOUT,
};

export function isActionMode(value: number): value is ActionMode {
  return value >= 0 && value <= 4 && Number.isInteger(value);
}

export function getActionFlags(mode: ActionMode): number {
  return ACTION_MODE_FLAGS[mode];
}

export function actionModeIncludes(mode: ActionMode, flag: number): boolean {
  return (getActionFlags(mode) & flag) !== 0;
}

export function isLogOnlyMode(mode: ActionMode): boolean {
  return mode === 2;
}

export function formatActionMode(mode: number): string {
  const labels: Record<ActionMode, string> = {
    0: '0 — Delete + ban (high confidence)',
    1: '1 — Delete + log',
    2: '2 — Log only',
    3: '3 — Delete + timeout (high confidence)',
    4: '4 — Delete + ban + timeout (high confidence)',
  };

  if (isActionMode(mode)) {
    return labels[mode];
  }

  return String(mode);
}

export function describeActionModeFlags(mode: ActionMode): string {
  if (mode === 2) return 'log';

  const parts: string[] = [];
  if (actionModeIncludes(mode, ActionFlag.DELETE)) parts.push('delete');
  if (actionModeIncludes(mode, ActionFlag.BAN)) parts.push('ban');
  if (actionModeIncludes(mode, ActionFlag.TIMEOUT)) parts.push('timeout');
  parts.push('log');
  return parts.join(' + ');
}
