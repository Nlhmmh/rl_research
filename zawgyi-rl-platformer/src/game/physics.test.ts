import { describe, expect, it } from 'vitest';
import { HimavantaEnvironment } from './environment';

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
    expect(env.step(2).state).toEqual(last);
  });
});
