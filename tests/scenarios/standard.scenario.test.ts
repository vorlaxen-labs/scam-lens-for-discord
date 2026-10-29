import { afterEach, describe, expect, it } from 'vitest';
import { runScenario } from '../shared/run-scenario.js';
import { STANDARD_SCENARIOS } from '../shared/scenario-definitions.js';
import { createScenarioWorld, type ScenarioWorld } from '../shared/scenario-world.js';

describe('detection scenarios', () => {
  let world: ScenarioWorld;

  afterEach(() => {
    world?.close();
  });

  it('scenario names are unique', () => {
    const names = STANDARD_SCENARIOS.map((scenario) => scenario.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.length).toBeGreaterThanOrEqual(80);
  });

  describe.each(STANDARD_SCENARIOS.map((scenario) => [scenario.name, scenario] as const))(
    '%s',
    (_name, scenario) => {
      it('matches expectations', async () => {
        world = createScenarioWorld();
        await runScenario(world, scenario);
      });
    },
  );
});
