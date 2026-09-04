export const ActionFlag = {
  DELETE: 1,
  BAN: 2,
} as const;

export type ActionMode = 0 | 1 | 2;

const ACTION_MODE_FLAGS: Record<ActionMode, number> = {
  0: ActionFlag.DELETE | ActionFlag.BAN,
  1: ActionFlag.DELETE,
  2: 0,
};

export function isActionMode(value: number): value is ActionMode {
  return value >= 0 && value <= 2 && Number.isInteger(value);
}

export function normalizeActionMode(value: number): ActionMode {
  if (isActionMode(value)) return value;
  if (value === 3) return 1;
  if (value === 4) return 0;
  return 1;
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
  const normalized = normalizeActionMode(mode);
  const labels: Record<ActionMode, string> = {
    0: '0 — Delete + ban (high confidence)',
    1: '1 — Delete + log',
    2: '2 — Log only',
  };

  return labels[normalized];
}

export function describeActionModeFlags(mode: ActionMode): string {
  if (mode === 2) return 'log';

  const parts: string[] = [];
  if (actionModeIncludes(mode, ActionFlag.DELETE)) parts.push('delete');
  if (actionModeIncludes(mode, ActionFlag.BAN)) parts.push('ban');
  parts.push('log');
  return parts.join(' + ');
}
