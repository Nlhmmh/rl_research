import { describe, expect, it } from 'vitest';
import { ReplayBuffer } from './ReplayBuffer';

describe('ReplayBuffer', () => {
  it('keeps its configured capacity and samples experiences', () => {
    const buffer = new ReplayBuffer(2);
    for (let action = 0; action < 3; action++)
      buffer.add({
        state: [action],
        action: 0,
        reward: action,
        nextState: [action + 1],
        done: false,
      });
    expect(buffer.size).toBe(2);
    expect(buffer.sample(2)).toHaveLength(2);
  });
});
