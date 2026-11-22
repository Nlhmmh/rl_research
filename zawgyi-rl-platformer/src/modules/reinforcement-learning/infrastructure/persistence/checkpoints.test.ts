import { expect, it, vi } from 'vitest';
import * as tf from '@tensorflow/tfjs';
import { DQNAgent } from '../algorithms/dqn/DQNAgent';
import { LEVEL, OBSERVATION_VERSION } from '../../../game/domain/level';
const storage = vi.hoisted(() => ({ listRecords: vi.fn(), get: vi.fn(), set: vi.fn() }));
vi.mock('./sqlite-client', () => ({
  listRecords: storage.listRecords,
  get: storage.get,
  set: storage.set,
}));
import {
  dqnHandler,
  listPolicies,
  loadMetadata,
  preferredWatchPolicy,
  runCheckpointId,
  saveDqnAgent,
} from './checkpoints';

it('sorts policies across runs and marks old versions', async () => {
  const metadata = {
    schemaVersion: 1,
    id: 'run-a/AI-1',
    algorithm: 'q-learning',
    savedAt: '2026-11-15T01:00:00Z',
    levelId: LEVEL.id,
    observationVersion: OBSERVATION_VERSION,
    rewardVersion: 'v2',
    episode: 100,
    epsilon: 0.1,
  };
  storage.listRecords.mockResolvedValue([
    metadata,
    { ...metadata, id: 'run-b/AI-2', algorithm: 'dqn', savedAt: '2026-11-15T02:00:00Z' },
    { ...metadata, id: 'old/AI-1', observationVersion: 'v1' },
  ]);
  const policies = await listPolicies();
  expect(policies.map((item) => item.metadata.id)).toEqual([
    'run-b/AI-2',
    'run-a/AI-1',
    'old/AI-1',
  ]);
  expect(policies.map((item) => item.compatible)).toEqual([true, true, false]);
});

it('prefers a solved Best to the latest unsuccessful Final', () => {
  const metadata = {
    schemaVersion: 1,
    id: 'run-a/AI-1/best',
    algorithm: 'q-learning',
    savedAt: '2026-11-15T01:00:00Z',
    levelId: LEVEL.id,
    observationVersion: OBSERVATION_VERSION,
    rewardVersion: 'v2',
    episode: 100,
    epsilon: 0.1,
  } as const;
  const finalId = 'run-a/AI-1/final';
  const manifest = {
    ...metadata,
    runId: 'run-a',
    agentIds: ['AI-1'],
    checkpoints: { 'AI-1': { bestId: metadata.id, finalId } },
    saveType: 'policy-checkpoint',
  } as const;
  const policies = [
    {
      compatible: true,
      metadata: {
        ...metadata,
        id: finalId,
        details: {
          kind: 'final',
          evaluation: { episode: 600, success: false, steps: 1200, reward: -40 },
        },
      },
    },
    {
      compatible: true,
      metadata: {
        ...metadata,
        details: {
          kind: 'best',
          evaluation: { episode: 100, success: true, steps: 491, reward: 100 },
        },
      },
    },
  ] satisfies Awaited<ReturnType<typeof listPolicies>>;
  const saved = { ...manifest, agentIds: [...manifest.agentIds] };
  expect(preferredWatchPolicy(policies, saved)).toBe(metadata.id);
  expect(runCheckpointId(saved, 'AI-1')).toBe(finalId);
  expect(runCheckpointId({ ...saved, checkpoints: undefined }, 'AI-1')).toBe('run-a/AI-1');
});

it('stores DQN weights and metadata together and can reload them', async () => {
  const records = new Map<string, unknown>();
  storage.set.mockImplementation(async (key: string, value: unknown) => {
    records.set(key, value);
  });
  storage.get.mockImplementation(async (key: string) => records.get(key));
  await tf.ready();
  const agent = new DQNAgent();
  const id = 'run-a/AI-1/final';
  let model: tf.LayersModel | undefined;
  try {
    await saveDqnAgent(id, agent, 100, { kind: 'final', stopReason: 'step-budget' });
    expect(storage.set).toHaveBeenCalledExactlyOnceWith(
      `zawgyi/checkpoint/${id}`,
      expect.objectContaining({
        metadata: expect.objectContaining({ episode: 100 }),
        model: expect.any(Object),
      }),
    );
    expect(await loadMetadata(id, 'dqn')).toMatchObject({ id, episode: 100 });
    model = await tf.loadLayersModel(dqnHandler(id));
    expect(model.getWeights().map((weight) => Array.from(weight.dataSync()))).toEqual(
      agent.online.getWeights().map((weight) => Array.from(weight.dataSync())),
    );
  } finally {
    model?.dispose();
    agent.dispose();
  }
});
