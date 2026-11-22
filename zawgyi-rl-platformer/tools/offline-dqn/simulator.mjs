import * as tf from '@tensorflow/tfjs';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline';

// Node needs extensions for the game's Vite-style relative imports.
const sourceRoot = new URL('../../src/', import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && context.parentURL?.startsWith(sourceRoot)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL);
      if (existsSync(candidate)) return nextResolve(candidate.href, context);
    }
    return nextResolve(specifier, context);
  },
});

const { HimavantaEnvironment } = await import('../../src/modules/game/domain/environment.ts');
const { LEVEL, EVALUATION, OBSERVATION_VERSION, REWARD_VERSION } =
  await import('../../src/modules/game/domain/level.ts');
const { ACTIONS } = await import('../../src/modules/game/domain/types.ts');
const { OBSERVATION_SIZE, observe } =
  await import('../../src/modules/reinforcement-learning/domain/policies/observation.ts');
const { DQN_CONFIG } =
  await import('../../src/modules/reinforcement-learning/domain/policies/dqnConfig.ts');

const { createDqnNetwork } =
  await import('../../src/modules/reinforcement-learning/infrastructure/algorithms/dqn/DQNAgent.ts');

await tf.setBackend('cpu');
const network = createDqnNetwork();
let model;
try {
  await network.save(
    tf.io.withSaveHandler(async (artifacts) => {
      model = { modelTopology: artifacts.modelTopology, weightSpecs: artifacts.weightSpecs };
      return { modelArtifactsInfo: tf.io.getModelArtifactsInfoForJSON(artifacts) };
    }),
  );
} finally {
  network.dispose();
}

const send = (value) => stdout.write(`${JSON.stringify(value)}\n`);
const environments = [new HimavantaEnvironment(), new HimavantaEnvironment()];
send({
  levelId: LEVEL.id,
  observationVersion: OBSERVATION_VERSION,
  rewardVersion: REWARD_VERSION,
  observationSize: OBSERVATION_SIZE,
  actions: ACTIONS,
  evaluation: EVALUATION,
  dqn: DQN_CONFIG,
  model,
});

for await (const line of createInterface({ input: stdin })) {
  const [index, action] = JSON.parse(line);
  if ((index !== 0 && index !== 1) || (action !== null && !ACTIONS.includes(action))) {
    throw new Error('Invalid simulator command');
  }
  const environment = environments[index];
  if (action === null) {
    send(observe(environment.reset()));
  } else {
    const { state, reward, done, success } = environment.step(action);
    send([observe(state), reward, done, success]);
  }
}
