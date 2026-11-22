import type * as tf from '@tensorflow/tfjs';
import { get, listRecords, set } from './sqlite-client';
import { LEVEL, OBSERVATION_VERSION } from '../../../game/domain/level';
import { QLearningAgent } from '../algorithms/q-learning/QLearningAgent';
import type { Algorithm, TrainingStopReason } from '../workers/protocol';
import type { DQNAgent } from '../algorithms/dqn/DQNAgent';
import type { EvaluationResult } from '../../application/evaluation';

export interface CheckpointDetails {
  kind?: 'best' | 'final';
  evaluation?: EvaluationResult;
  stopReason?: TrainingStopReason | 'episode-limit';
  totalSteps?: number;
}

export interface CheckpointMetadata {
  schemaVersion: 1;
  id: string;
  algorithm: Algorithm;
  savedAt: string;
  levelId: string;
  observationVersion: typeof OBSERVATION_VERSION;
  rewardVersion: 'v2';
  episode: number;
  epsilon: number;
  details?: CheckpointDetails;
}

export interface AgentCheckpoints {
  finalId: string;
  bestId?: string;
}

export interface RunManifest {
  schemaVersion: 1;
  runId: string;
  algorithm: Algorithm;
  levelId: string;
  agentIds: string[];
  checkpoints?: Record<string, AgentCheckpoints>;
  observationVersion: typeof OBSERVATION_VERSION;
  rewardVersion: 'v2';
  saveType: 'policy-checkpoint';
  savedAt: string;
}

const key = (id: string) => `zawgyi/checkpoint/${id}`;

export interface SavedPolicy {
  metadata: CheckpointMetadata;
  compatible: boolean;
}

export async function listPolicies(): Promise<SavedPolicy[]> {
  const records = await listRecords<CheckpointMetadata>();
  return records
    .filter((metadata) => ['q-learning', 'dqn'].includes(metadata.algorithm))
    .map((metadata) => {
      let compatible = true;
      try {
        validate(metadata);
      } catch {
        compatible = false;
      }
      return { metadata, compatible };
    })
    .sort((a, b) => b.metadata.savedAt.localeCompare(a.metadata.savedAt));
}

function validate(metadata: CheckpointMetadata, algorithm?: Algorithm): void {
  if (
    metadata.schemaVersion !== 1 ||
    metadata.levelId !== LEVEL.id ||
    metadata.observationVersion !== OBSERVATION_VERSION ||
    metadata.rewardVersion !== 'v2' ||
    (algorithm && metadata.algorithm !== algorithm)
  ) {
    throw new Error('Checkpoint is incompatible with the current environment');
  }
}

export async function saveQAgent(
  id: string,
  agent: QLearningAgent,
  episode: number,
  details?: CheckpointDetails,
): Promise<void> {
  const metadata: CheckpointMetadata = {
    schemaVersion: 1,
    id,
    algorithm: 'q-learning',
    savedAt: new Date().toISOString(),
    levelId: LEVEL.id,
    observationVersion: OBSERVATION_VERSION,
    rewardVersion: 'v2',
    episode,
    epsilon: agent.epsilon,
    details,
  };
  await set(key(id), { metadata, policy: agent.serialize() });
}

export async function loadQAgent(id: string) {
  const saved = await get<{
    metadata: CheckpointMetadata;
    policy: ReturnType<QLearningAgent['serialize']>;
  }>(key(id));
  if (!saved) throw new Error(`No saved agent: ${id}`);
  validate(saved.metadata, 'q-learning');
  const agent = new QLearningAgent();
  agent.load(saved.policy);
  return { agent, metadata: saved.metadata };
}

export function dqnHandler(id: string): tf.io.IOHandler {
  return {
    async load() {
      const saved = await get<{ model?: tf.io.ModelArtifacts }>(key(id));
      const artifacts = saved?.model ?? (await get<tf.io.ModelArtifacts>(`${key(id)}/model`));
      if (!artifacts) throw new Error(`Missing DQN model: ${id}`);
      return artifacts;
    },
  };
}

export async function saveDqnAgent(
  id: string,
  agent: DQNAgent,
  episode: number,
  details?: CheckpointDetails,
): Promise<void> {
  const metadata: CheckpointMetadata = {
    schemaVersion: 1,
    id,
    algorithm: 'dqn',
    savedAt: new Date().toISOString(),
    levelId: LEVEL.id,
    observationVersion: OBSERVATION_VERSION,
    rewardVersion: 'v2',
    episode,
    epsilon: agent.epsilon,
    details,
  };
  await agent.online.save({
    async save(artifacts) {
      await set(key(id), { metadata, model: artifacts });
      return {
        modelArtifactsInfo: {
          dateSaved: new Date(),
          modelTopologyType: 'JSON',
          modelTopologyBytes: JSON.stringify(artifacts.modelTopology ?? {}).length,
          weightSpecsBytes: JSON.stringify(artifacts.weightSpecs ?? []).length,
          weightDataBytes: artifacts.weightData
            ? Array.isArray(artifacts.weightData)
              ? artifacts.weightData.reduce((sum, value) => sum + value.byteLength, 0)
              : artifacts.weightData.byteLength
            : 0,
        },
      };
    },
  });
}

export function runCheckpointId(manifest: RunManifest, agentId: string): string {
  return manifest.checkpoints?.[agentId]?.finalId ?? `${manifest.runId}/${agentId}`;
}

export function preferredWatchPolicy(
  policies: SavedPolicy[],
  manifest?: RunManifest,
): string | undefined {
  const compatible = policies.filter((item) => item.compatible).map((item) => item.metadata);
  const solved = compatible.filter((item) => item.details?.evaluation?.success);
  const preferred = solved.filter((item) => item.details?.kind === 'best');
  const latestBestIds = Object.values(manifest?.checkpoints ?? {}).map((item) => item.bestId);
  const latestBest = preferred
    .filter((item) => latestBestIds.includes(item.id))
    .sort((a, b) => a.details!.evaluation!.steps - b.details!.evaluation!.steps)[0];
  return (
    latestBest?.id ??
    preferred[0]?.id ??
    solved[0]?.id ??
    compatible.find((item) =>
      manifest?.agentIds.some((id) => runCheckpointId(manifest, id) === item.id),
    )?.id ??
    compatible[0]?.id
  );
}

export async function loadMetadata(id: string, algorithm?: Algorithm): Promise<CheckpointMetadata> {
  const saved = await get<{ metadata: CheckpointMetadata }>(key(id));
  if (!saved) throw new Error(`No saved agent: ${id}`);
  validate(saved.metadata, algorithm);
  return saved.metadata;
}

export async function saveManifest(manifest: RunManifest): Promise<void> {
  await set('zawgyi/latest-manifest', manifest);
}

export async function loadManifest(): Promise<RunManifest> {
  const manifest = await get<RunManifest>('zawgyi/latest-manifest');
  if (!manifest || manifest.levelId !== LEVEL.id) throw new Error('No compatible saved run');
  return manifest;
}
