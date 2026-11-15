import * as tf from '@tensorflow/tfjs';
import { expect, it } from 'vitest';
import { DQNAgent } from './DQNAgent';

it('can predict and train through repeated target synchronization', async () => {
  await tf.setBackend('cpu');
  await tf.ready();
  const agent = new DQNAgent();
  try {
    const observation = [0.1, 0.2, 0.65, 0, 0, 0, 1, 0.9];
    expect(agent.act(observation, false)).toBeGreaterThanOrEqual(0);
    for (let index = 0; index < 32; index++)
      agent.remember({
        state: observation,
        action: 2,
        reward: 1,
        nextState: observation,
        done: true,
      });
    agent.targetUpdateEvery = 1;
    await agent.trainBatch();
    const tensors = tf.memory().numTensors;
    await agent.trainBatch();
    await agent.trainBatch();
    expect(agent.trainingUpdates).toBe(3);
    expect(agent.act(observation, false)).toBeLessThan(6);
    expect(tf.memory().numTensors).toBe(tensors);
  } finally {
    agent.dispose();
  }
});
