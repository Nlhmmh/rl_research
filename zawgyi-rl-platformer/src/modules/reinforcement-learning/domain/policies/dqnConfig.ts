export const DQN_CONFIG = {
  hiddenUnits: [64, 64],
  replayCapacity: 20_000,
  batchSize: 32,
  updateEvery: 4,
  targetUpdateEvery: 250,
  learningRate: 0.001,
  gamma: 0.99,
  epsilon: 1,
  minEpsilon: 0.05,
  epsilonDecay: 0.995,
} as const;
