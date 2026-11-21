import { HimavantaEnvironment } from '../../game/domain/environment';
import type { Action, PlayerState } from '../../game/domain/types';

export interface EvaluationResult {
  episode: number;
  success: boolean;
  steps: number;
  reward: number;
}

export function isBetterEvaluation(candidate: EvaluationResult, best: EvaluationResult | null) {
  return (
    best === null ||
    (candidate.success && !best.success) ||
    (candidate.success && best.success && candidate.steps < best.steps)
  );
}

// A fresh fixed-level environment; caller supplies inference only.
export async function evaluatePolicy(
  episode: number,
  act: (state: PlayerState) => Action,
  continueEvaluation: () => Promise<boolean> = async () => true,
): Promise<EvaluationResult | null> {
  const env = new HimavantaEnvironment();
  let state = env.reset();
  let reward = 0;
  while (!state.done) {
    if (!(await continueEvaluation())) return null;
    const result = env.step(act(state));
    state = result.state;
    reward += result.reward;
  }
  return { episode, success: state.success, steps: state.steps, reward };
}
