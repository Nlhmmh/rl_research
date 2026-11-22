import * as tf from '@tensorflow/tfjs';
import {
  dqnHandler,
  listPolicies,
  loadManifest,
  loadMetadata,
  loadQAgent,
  preferredWatchPolicy,
  type SavedPolicy,
} from '../../modules/reinforcement-learning/infrastructure/persistence/checkpoints';
import { DQNAgent } from '../../modules/reinforcement-learning/infrastructure/algorithms/dqn/DQNAgent';
import type { QLearningAgent } from '../../modules/reinforcement-learning/infrastructure/algorithms/q-learning/QLearningAgent';
import { HimavantaEnvironment } from '../../modules/game/domain/environment';
import { TIMING } from '../../modules/game/domain/level';
import { observe } from '../../modules/reinforcement-learning/domain/policies/observation';
import { qStateKey } from '../../modules/reinforcement-learning/infrastructure/algorithms/q-learning/observation-q';
import { watchSnapshot } from '../../modules/game/application/snapshot';
import {
  ACTION,
  ACTIONS,
  type Action,
  type AgentSnapshot,
  type PlayerState,
} from '../../modules/game/domain/types';

export type WatchSpeed = 1 | 2 | 4;
type Policy =
  { q: QLearningAgent; dqn?: never; label: string } | { dqn: DQNAgent; q?: never; label: string };

interface WatchGameCallbacks {
  onSnapshot: (snapshot: AgentSnapshot) => void;
  onPause: (paused: boolean) => void;
  onSpeed: (speed: WatchSpeed) => void;
  onMessage: (message: string) => void;
}

export function createWatchGame(callbacks: WatchGameCallbacks) {
  const env = new HimavantaEnvironment();
  let policy: Policy | null = null;
  let paused = false;
  let speed: WatchSpeed = 1;
  let episode = 1;
  let reward = 0;
  let action: Action = ACTION.IDLE;
  let timer: number | undefined;
  let disposed = false;
  let loadVersion = 0;

  function publishSnapshot() {
    callbacks.onSnapshot(watchSnapshot(env, action, episode, reward, paused));
  }

  function resetEpisode() {
    env.reset();
    episode++;
    reward = 0;
    action = ACTION.IDLE;
  }

  function restart() {
    resetEpisode();
    publishSnapshot();
  }

  function chooseAction(state: PlayerState): Action {
    if (policy?.q) return policy.q.act(qStateKey(state), false);
    if (policy?.dqn) return policy.dqn.act(observe(state), false);
    return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  }

  function advanceSimulation() {
    if (env.getState().done) return;
    for (let step = 0; step < speed; step++) {
      action = chooseAction(env.getState());
      const result = env.step(action);
      reward += result.reward;
      if (result.done) break;
    }
    publishSnapshot();
  }

  function tick() {
    if (disposed) return;
    if (!paused) advanceSimulation();
    timer = window.setTimeout(tick, TIMING.tickMs);
  }

  function togglePause() {
    paused = !paused;
    callbacks.onPause(paused);
    publishSnapshot();
  }

  function changeSpeed(value: WatchSpeed) {
    speed = value;
    callbacks.onSpeed(value);
  }

  async function readPolicy(id: string): Promise<Policy> {
    const metadata = await loadMetadata(id);
    const agentId = id;
    if (metadata.algorithm === 'q-learning') {
      const loaded = await loadQAgent(id);
      return { q: loaded.agent, label: `${agentId} Q-Learning` };
    }
    await tf.ready();
    const model = await tf.loadLayersModel(dqnHandler(id));
    let dqn: DQNAgent | undefined;
    try {
      dqn = new DQNAgent();
      dqn.replaceOnlineModel(model);
      dqn.epsilon = metadata.epsilon;
      return { dqn, label: `${agentId} DQN` };
    } catch (error) {
      if (dqn) dqn.dispose();
      else model.dispose();
      throw error;
    }
  }

  async function loadPolicy(checkpointId?: string, saved?: SavedPolicy[]) {
    const version = ++loadVersion;
    try {
      let id = checkpointId;
      if (!id) {
        const [policies, manifest] = await Promise.all([
          saved ?? listPolicies(),
          loadManifest().catch(() => undefined),
        ]);
        id = preferredWatchPolicy(policies, manifest);
        if (!id) return;
      }
      const loaded = await readPolicy(id);
      if (disposed || version !== loadVersion) {
        loaded.dqn?.dispose();
        return;
      }
      policy?.dqn?.dispose();
      policy = loaded;
      callbacks.onMessage(`Loaded ${policy.label}. Exploration is off.`);
      restart();
      return id;
    } catch (error) {
      if (!disposed && version === loadVersion) {
        callbacks.onMessage(error instanceof Error ? error.message : String(error));
      }
    }
  }

  async function loadPreferred(saved?: SavedPolicy[]) {
    return loadPolicy(undefined, saved);
  }

  function useRandom() {
    loadVersion++;
    policy?.dqn?.dispose();
    policy = null;
    callbacks.onMessage('Random untrained baseline selected.');
    restart();
  }

  function start() {
    if (disposed || timer !== undefined) return;
    timer = window.setTimeout(tick, TIMING.tickMs);
  }

  function dispose() {
    disposed = true;
    loadVersion++;
    window.clearTimeout(timer);
    policy?.dqn?.dispose();
    policy = null;
  }

  return {
    start,
    dispose,
    restart,
    togglePause,
    changeSpeed,
    loadPreferred,
    loadPolicy,
    useRandom,
  };
}
