import { expect, it } from 'vitest';
import { HimavantaEnvironment } from './environment';
import { REWARDS } from './level';

it('rewards forward walking more than jumping the same distance', () => {
  const walking = new HimavantaEnvironment().step(2);
  const jumping = new HimavantaEnvironment().step(5);
  expect(walking.state.x).toBe(jumping.state.x);
  expect(walking.reward).toBeGreaterThan(jumping.reward);
});

it('does not award walking progress repeatedly over the same ground', () => {
  const env = new HimavantaEnvironment();
  const first = env.step(2);
  env.step(1);
  const repeated = env.step(2);
  expect(first.reward - repeated.reward).toBeCloseTo(REWARDS.walkingProgress * 3);
});

it('charges jumping only on takeoff, including idle jumps', () => {
  const env = new HimavantaEnvironment();
  expect(env.step(3).reward).toBeCloseTo(REWARDS.step + REWARDS.jumpTakeoff);
  expect(env.step(3).reward).toBeCloseTo(REWARDS.step);
});
