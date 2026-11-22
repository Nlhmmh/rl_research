import { describe, expect, it } from 'vitest';
import { HimavantaEnvironment } from './environment';
import { LEVEL } from './level';
import { ACTION } from './types';

// These tests validate basic contracts, not whether RL has learned.
describe('HimavantaEnvironment', () => {
  it('starts on solid ground', () => {
    const env = new HimavantaEnvironment();
    expect(env.reset().grounded).toBe(true);
  });

  it('moves right under the same rules as human mode', () => {
    const env = new HimavantaEnvironment();
    env.reset();
    const result = env.step(2);
    expect(result.state.x).toBeGreaterThan(80);
  });

  it('does not update completed episodes', () => {
    const env = new HimavantaEnvironment();
    let last = env.reset();
    while (!last.done) last = env.step(0).state;
    expect(last.steps).toBe(LEVEL.maxSteps);
    expect(env.step(2).state).toEqual(last);
  });

  it('allows unlimited idle steps with no limit and still ends on a fall', () => {
    const env = new HimavantaEnvironment({ maxSteps: null });
    for (let step = 0; step <= LEVEL.maxSteps; step++) env.step(ACTION.IDLE);
    expect(env.getState()).toMatchObject({ steps: LEVEL.maxSteps + 1, done: false });

    for (let step = 0; step < LEVEL.maxSteps && !env.getState().done; step++) {
      env.step(ACTION.RIGHT);
    }
    expect(env.getState()).toMatchObject({ done: true, success: false });
  });
});
