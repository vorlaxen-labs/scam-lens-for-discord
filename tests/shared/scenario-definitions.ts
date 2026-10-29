import { DOMAIN_SCENARIOS } from './scenarios/domain.js';
import { DETECTION_SCENARIOS } from './scenarios/detection.js';
import { HASH_SCENARIOS } from './scenarios/hash.js';
import { IMAGE_SCENARIOS } from './scenarios/images.js';
import { POLICY_SCENARIOS } from './scenarios/policy.js';
import type { ScenarioCase } from './types.js';

export const STANDARD_SCENARIOS: ScenarioCase[] = [
  ...DOMAIN_SCENARIOS,
  ...DETECTION_SCENARIOS,
  ...POLICY_SCENARIOS,
  ...HASH_SCENARIOS,
  ...IMAGE_SCENARIOS,
];
