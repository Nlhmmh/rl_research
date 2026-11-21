import { expect, it } from 'vitest';
import { evaluatePolicy, isBetterEvaluation, type EvaluationResult } from './evaluation';
import { QLearningAgent } from '../infrastructure/algorithms/q-learning/QLearningAgent';
import { qStateKey } from '../infrastructure/algorithms/q-learning/observation-q';
import { LEVEL } from '../../game/domain/level';

const result = (success: boolean, steps: number): EvaluationResult => ({
  episode: 100,
  success,
  steps,
  reward: 0,
});

it('ranks completion ahead of speed and ignores tied or failed attempts', () => {
  expect(isBetterEvaluation(result(false, 50), null)).toBe(true);
  expect(isBetterEvaluation(result(true, 500), result(false, 50))).toBe(true);
  expect(isBetterEvaluation(result(false, 20), result(true, 500))).toBe(false);
  expect(isBetterEvaluation(result(true, 490), result(true, 500))).toBe(true);
  expect(isBetterEvaluation(result(true, 500), result(true, 500))).toBe(false);
  expect(isBetterEvaluation(result(false, 20), result(false, 50))).toBe(false);
});

it('evaluates without changing Q-values or epsilon', async () => {
  const agent = new QLearningAgent();
  const before = agent.serialize();
  const evaluation = await evaluatePolicy(100, (state) => agent.act(qStateKey(state), false));
  expect(evaluation?.episode).toBe(100);
  expect(evaluation?.steps).toBe(LEVEL.maxSteps);
  expect(agent.serialize()).toEqual(before);
});

it('can cancel an evaluation', async () => {
  expect(
    await evaluatePolicy(
      100,
      () => 0,
      async () => false,
    ),
  ).toBeNull();
});
