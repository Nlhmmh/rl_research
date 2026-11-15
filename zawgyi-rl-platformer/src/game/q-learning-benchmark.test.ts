import { it, expect, vi } from 'vitest';
import { HimavantaEnvironment } from './environment';
import { observe } from './observation';
import { qStateKey } from './observation-q';
import type { PlayerState } from './types';
import { QLearningAgent } from '../rl/QLearningAgent';

function oldKey(state: PlayerState) {
  const v = observe(state);
  return [
    Math.min(15, Math.floor(v[0] * 16)),
    Math.floor((v[1] + 1) * 6),
    Math.floor(v[2] * 3),
    Math.floor((v[3] + 1) * 4),
    Math.floor((v[5] + 1) * 4),
    v[6],
  ].join('|');
}

it('compares learned policies with identical seeded training budgets', () => {
  const results = [];
  for (const improved of [false, true]) {
    let wins = 0;
    for (const seed of [11, 29, 47]) {
      let rng = seed;
      const random = vi.spyOn(Math, 'random').mockImplementation(() => {
        rng = (Math.imul(1664525, rng) + 1013904223) >>> 0;
        return rng / 4294967296;
      });
      try {
        const agent = new QLearningAgent();
        if (!improved) {
          agent.gamma = 0.95;
          agent.epsilonDecay = 0.997;
        }
        const key = improved ? qStateKey : oldKey;
        const env = new HimavantaEnvironment();
        for (let episode = 0; episode < 5000; episode++) {
          let state = env.reset();
          while (!state.done) {
            const action = agent.act(key(state));
            const result = env.step(action);
            agent.learn(key(state), action, result.reward, key(result.state), result.done);
            state = result.state;
          }
          agent.finishEpisode();
        }
        for (let episode = 0; episode < 20; episode++) {
          let state = env.reset();
          while (!state.done) state = env.step(agent.act(key(state), false)).state;
          if (state.success) wins++;
        }
      } finally {
        random.mockRestore();
      }
    }
    results.push(wins);
  }
  console.log({ baselineWins: results[0], improvedWins: results[1], evaluationEpisodes: 60 });
  expect(results[1]).toBeGreaterThanOrEqual(results[0]);
}, 120000);
