import { expect, it, vi } from 'vitest';
import { LEVEL, OBSERVATION_VERSION } from '../game/level';
const storage = vi.hoisted(() => ({ entries: vi.fn() }));
vi.mock('idb-keyval', () => ({ entries: storage.entries, get: vi.fn(), set: vi.fn() }));
import { listPolicies } from './checkpoints';

it('lists policies across runs, skips model artifacts, and marks old versions', async () => {
  const metadata = { schemaVersion: 1, id: 'run-a/AI-1', algorithm: 'q-learning',
    savedAt: '2026-11-15T01:00:00Z', levelId: LEVEL.id,
    observationVersion: OBSERVATION_VERSION, rewardVersion: 'v2', episode: 100, epsilon: 0.1 };
  storage.entries.mockResolvedValue([
    ['zawgyi/checkpoint/run-a/AI-1', { metadata }],
    ['zawgyi/checkpoint/run-b/AI-2', { metadata: { ...metadata, id: 'run-b/AI-2',
      algorithm: 'dqn', savedAt: '2026-11-15T02:00:00Z' } }],
    ['zawgyi/checkpoint/run-b/AI-2/model', { modelTopology: {} }],
    ['zawgyi/checkpoint/old/AI-1', { metadata: { ...metadata, id: 'old/AI-1', observationVersion: 'v1' } }],
    ['zawgyi/latest-manifest', { runId: 'run-b' }],
  ]);
  const policies = await listPolicies();
  expect(policies.map((item) => item.metadata.id)).toEqual(['run-b/AI-2', 'run-a/AI-1', 'old/AI-1']);
  expect(policies.map((item) => item.compatible)).toEqual([true, true, false]);
});
