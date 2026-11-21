import * as tf from '@tensorflow/tfjs';
import { OBSERVATION_SIZE } from '../../../domain/policies/observation';
import { ACTIONS, type Action } from '../../../../game/domain/types';
import { ReplayBuffer, type Experience } from './ReplayBuffer';

const ACTION_COUNT = ACTIONS.length;
const BATCH_SIZE = 32;

function createNetwork(): tf.Sequential {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [OBSERVATION_SIZE], units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dense({ units: ACTION_COUNT, activation: 'linear' }));
  return model;
}

export class DQNAgent {
  online: tf.LayersModel = createNetwork();
  target: tf.LayersModel = createNetwork();
  replay = new ReplayBuffer();
  epsilon = 1;
  minEpsilon = 0.05;
  epsilonDecay = 0.995;
  gamma = 0.99;
  trainingUpdates = 0;
  targetUpdateEvery = 250;

  constructor() {
    this.compileOnline();
    this.copyOnlineToTarget();
  }

  private compileOnline(): void {
    this.online.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
  }

  private copyOnlineToTarget(): void {
    // getWeights() exposes model-owned tensors. Dispose only our clones.
    const weights = this.online.getWeights().map((weight) => weight.clone());
    try {
      this.target.setWeights(weights);
    } finally {
      weights.forEach((weight) => weight.dispose());
    }
  }

  replaceOnlineModel(model: tf.LayersModel): void {
    this.online.dispose();
    this.online = model;
    this.compileOnline();
    this.copyOnlineToTarget();
  }

  act(observation: number[], explore = true): Action {
    if (explore && Math.random() < this.epsilon) {
      return ACTIONS[Math.floor(Math.random() * ACTION_COUNT)];
    }
    const qValues = tf.tidy(() => {
      const input = tf.tensor2d([observation], [1, OBSERVATION_SIZE]);
      return Array.from((this.online.predict(input) as tf.Tensor2D).dataSync());
    });
    let best = 0;
    for (let action = 1; action < ACTION_COUNT; action++) {
      if (qValues[action] > qValues[best]) best = action;
    }
    return best as Action;
  }

  remember(experience: Experience): void {
    this.replay.add(experience);
  }

  async trainBatch(): Promise<void> {
    if (this.replay.size < BATCH_SIZE) return;
    const batch = this.replay.sample(BATCH_SIZE);
    const stateRows = batch.map((item) => item.state);
    const nextRows = batch.map((item) => item.nextState);
    const currentQ = tf.tidy(() =>
      Array.from((this.online.predict(tf.tensor2d(stateRows)) as tf.Tensor2D).dataSync()),
    );
    const targetNextQ = tf.tidy(() =>
      Array.from((this.target.predict(tf.tensor2d(nextRows)) as tf.Tensor2D).dataSync()),
    );
    batch.forEach((item, index) => {
      const next = targetNextQ.slice(index * ACTION_COUNT, (index + 1) * ACTION_COUNT);
      currentQ[index * ACTION_COUNT + item.action] =
        item.reward + this.gamma * (item.done ? 0 : Math.max(...next));
    });
    const xs = tf.tensor2d(stateRows, [BATCH_SIZE, OBSERVATION_SIZE]);
    const ys = tf.tensor2d(currentQ, [BATCH_SIZE, ACTION_COUNT]);
    try {
      await this.online.trainOnBatch(xs, ys);
    } finally {
      xs.dispose();
      ys.dispose();
    }
    this.trainingUpdates++;
    if (this.trainingUpdates % this.targetUpdateEvery === 0) this.copyOnlineToTarget();
  }

  finishEpisode(): void {
    this.epsilon = Math.max(this.minEpsilon, this.epsilon * this.epsilonDecay);
  }

  dispose(): void {
    this.online.dispose();
    this.target.dispose();
  }
}
