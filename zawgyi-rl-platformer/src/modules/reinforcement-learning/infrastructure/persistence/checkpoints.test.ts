import { expect, it, vi } from 'vitest';
import { LEVEL, OBSERVATION_VERSION } from '../../../game/domain/level';
const storage = vi.hoisted(() => ({ listRecords: vi.fn() }));
vi.mock('./sqlite-client', () => ({
  listRecords: storage.listRecords,
  get: vi.fn(),
  set: vi.fn(),
}));
import { listPolicies } from './checkpoints';

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
