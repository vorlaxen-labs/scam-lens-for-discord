import { expect, type Mock } from 'vitest';
import { hammingDistance } from '../../src/shared/utils/hamming.util.js';
import type { DetectionContext, DomainMatch, ImageMatch } from '../../src/shared/types/index.js';
import type {
  DetectionExpect,
  DomainMatchExpect,
  HammingScenario,
  HashScenario,
  ScoreScenario,
} from './types.js';

const OPERATION_ID = /^SL-[0-9A-HJKMNP-TV-Z]{26}$/;
const BAN_REASON = 'Scam Lens: high-confidence scam content detected';
const TIMEOUT_REASON = 'Scam Lens: scam content detected';
const WARNING_DM =
  'Your account may have shared scam content. If you did not send this message, your account may have been compromised. Please secure your account.';

export function assertDomainMatches(
  actual: DomainMatch[],
  expected: DomainMatchExpect[],
): void {
  const sort = (matches: Array<{ domain: string; blockedDomain: string; source: string }>) =>
    [...matches].sort(
      (left, right) =>
        left.domain.localeCompare(right.domain) ||
        left.blockedDomain.localeCompare(right.blockedDomain) ||
        left.source.localeCompare(right.source),
    );

  expect(sort(actual)).toEqual(sort(expected));
}

export function assertDetectionOutcome(
  record: DetectionContext | undefined,
  mocks: {
    deleteMock: Mock;
    banMock: Mock;
    timeoutMock: Mock;
    dmMock: Mock;
  },
  expected: DetectionExpect,
): void {
  if (!expected.recorded) {
    expect(record).toBeUndefined();
    expect(mocks.deleteMock).not.toHaveBeenCalled();
    expect(mocks.banMock).not.toHaveBeenCalled();
    expect(mocks.timeoutMock).not.toHaveBeenCalled();
    expect(mocks.dmMock).not.toHaveBeenCalled();
    return;
  }

  expect(record).toBeDefined();
  expect(record!.operationId).toMatch(OPERATION_ID);
  expect(record!.metadataJson).toContain(record!.messageId);
  expect(record).toMatchObject({
    ...(expected.actionTaken !== undefined ? { actionTaken: expected.actionTaken } : {}),
    ...(expected.actionResult !== undefined ? { actionResult: expected.actionResult } : {}),
    ...(expected.detectionType !== undefined ? { detectionType: expected.detectionType } : {}),
    ...(expected.trustScore !== undefined ? { trustScore: expected.trustScore } : {}),
    ...(expected.matchedValue !== undefined ? { matchedValue: expected.matchedValue } : {}),
    ...(expected.hammingDistance !== undefined
      ? { hammingDistance: expected.hammingDistance }
      : {}),
    ...(expected.actionMode !== undefined ? { actionMode: expected.actionMode } : {}),
  });

  if (expected.deleted || expected.deleteAttempted) {
    expect(mocks.deleteMock).toHaveBeenCalledTimes(1);
  } else if (expected.deleted === false) {
    expect(mocks.deleteMock).not.toHaveBeenCalled();
  }

  if (expected.banned) {
    expect(mocks.banMock).toHaveBeenCalledWith({ reason: BAN_REASON });
  } else if (expected.banned === false) {
    expect(mocks.banMock).not.toHaveBeenCalled();
  }

  if (expected.timedOut) {
    expect(mocks.timeoutMock).toHaveBeenCalledWith(expected.timeoutMs, TIMEOUT_REASON);
  } else if (expected.timedOut === false) {
    expect(mocks.timeoutMock).not.toHaveBeenCalled();
  }

  if (expected.dmSent) {
    expect(mocks.dmMock).toHaveBeenCalledWith(WARNING_DM);
  } else if (expected.dmSent === false) {
    expect(mocks.dmMock).not.toHaveBeenCalled();
  }
}

export function assertScore(
  actual: { trustScore: number; autoBan: boolean; applyTimeout?: boolean },
  expected: ScoreScenario['expect'],
): void {
  expect(actual.trustScore).toBe(expected.trustScore);
  expect(actual.autoBan).toBe(expected.autoBan);
  if (expected.applyTimeout !== undefined) {
    expect(actual.applyTimeout).toBe(expected.applyTimeout);
  }
}

export function assertHamming(scenario: HammingScenario): void {
  if ('error' in scenario.expect) {
    expect(() => hammingDistance(scenario.left, scenario.right)).toThrow(scenario.expect.error);
    return;
  }
  expect(hammingDistance(scenario.left, scenario.right)).toBe(scenario.expect.distance);
}

export function assertHashMatch(
  actual: ImageMatch | null,
  expected: HashScenario['expect']['match'],
): void {
  if (expected === null) {
    expect(actual).toBeNull();
    return;
  }
  expect(actual).toMatchObject(expected);
}
