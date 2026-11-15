import { describe, expect, it } from 'vitest';
import { QLearningAgent } from './QLearningAgent';

describe('QLearningAgent', () => {
  it('applies a terminal Bellman update without bootstrapping', () => {
    const agent = new QLearningAgent();
    agent.alpha = 0.5;
    agent.gamma = 0.9;
    agent.learn('start', 2, 10, 'end', true);
    expect(agent.table.get('start')?.[2]).toBe(5);
  });

  it('round-trips a policy checkpoint', () => {
    const original = new QLearningAgent();
    original.learn('s', 5, 8, 'n', true);
    const restored = new QLearningAgent();
    restored.load(original.serialize());
    expect(restored.serialize()).toEqual(original.serialize());
  });

  it('never decays epsilon below its minimum', () => {
    const agent = new QLearningAgent();
    for (let index = 0; index < 10_000; index++) agent.finishEpisode();
    expect(agent.epsilon).toBe(agent.minEpsilon);
  });
});
