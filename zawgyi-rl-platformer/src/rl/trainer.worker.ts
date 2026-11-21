/// <reference lib="webworker" />
import * as tf from '@tensorflow/tfjs';
import { HimavantaEnvironment } from '../game/environment';
import { observe } from '../game/observation';
import { qStateKey } from '../game/observation-q';
import { EVALUATION } from '../game/level';
import { evaluatePolicy, isBetterEvaluation, type EvaluationResult } from './evaluation';
import type { CheckpointDetails } from '../persistence/checkpoints';
import {
  dqnHandler,
  loadMetadata,
  loadQAgent,
  saveDqnMetadata,
  saveQAgent,
} from '../persistence/checkpoints';
import { DQNAgent } from './DQNAgent';
import { QLearningAgent } from './QLearningAgent';
import type { AgentStats, Algorithm, TrainingSpeed, WorkerCommand, WorkerEvent } from './protocol';

const send = (event: WorkerEvent) => self.postMessage(event);
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let running = false;
let paused = false;
let renderAgents = true;
let speed: TrainingSpeed = 1;
let q: QLearningAgent | null = null;
let dqn: DQNAgent | null = null;
let workerId = '';
let algorithm: Algorithm = 'q-learning';
let episodeNumber = 0;
let latestStats: AgentStats | null = null;
let pendingUpdate: Promise<void> = Promise.resolve();

function publishStatus(status: AgentStats['status']): void {
  if (latestStats) send({ type: 'stats', stats: { ...latestStats, status } });
}

async function train(id: string, selectedAlgorithm: Algorithm, episodes: number) {
  running = true;
  paused = false;
  workerId = id;
  algorithm = selectedAlgorithm;
  latestStats = {
    id,
    algorithm,
    episode: episodeNumber,
    targetEpisodes: episodes,
    totalSteps: latestStats?.totalSteps ?? 0,
    episodeReward: 0,
    averageReward100: latestStats?.averageReward100 ?? 0,
    successRate100: latestStats?.successRate100 ?? 0,
    successes: latestStats?.successes ?? 0,
    failures: latestStats?.failures ?? 0,
    epsilon: q?.epsilon ?? dqn?.epsilon ?? 1,
    status: 'running',
  };
  publishStatus('running');
  try {
    const checkpointRoot = `run-${crypto.randomUUID()}/${id}`;
    let best: EvaluationResult | null = null;
    let lastEvaluation: EvaluationResult | null = null;
    let staleEvaluations = 0;
    let completedEpisode = episodeNumber;
    let stopReason: 'episode-limit' | 'no-improvement' = 'episode-limit';

    async function evaluateCompletedPolicy() {
      let evaluationSteps = 0;
      const result = await evaluatePolicy(
        completedEpisode,
        (state) =>
          algorithm === 'q-learning'
            ? q!.act(qStateKey(state), false)
            : dqn!.act(observe(state), false),
        async () => {
          if (++evaluationSteps % 32 === 0) await delay(0);
          while (paused && running) await delay(30);
          return running;
        },
      );
      if (!result || !running) return;
      lastEvaluation = result;
      if (isBetterEvaluation(result, best)) {
        await writePolicy(`${checkpointRoot}/best`, completedEpisode, {
          kind: 'best',
          evaluation: result,
        });
        best = result;
        staleEvaluations = 0;
        send({ type: 'policy-saved', id, checkpointId: `${checkpointRoot}/best`, kind: 'best' });
      } else staleEvaluations++;
      send({ type: 'evaluation', id, result, best: best!, staleEvaluations });
    }
    const env = new HimavantaEnvironment();
    if (algorithm === 'q-learning') q ??= new QLearningAgent();
    else if (!dqn) {
      await tf.setBackend('cpu');
      await tf.ready();
      dqn = new DQNAgent();
    }
    let totalSteps = latestStats?.totalSteps ?? 0;
    let successes = latestStats?.successes ?? 0;
    let failures = latestStats?.failures ?? 0;
    const recent: Array<{ reward: number; success: boolean }> = [];
    let lastSnapshotAt = 0;
    for (
      episodeNumber = (episodeNumber || 0) + 1;
      episodeNumber <= episodes && running;
      episodeNumber++
    ) {
      let state = env.reset();
      let episodeReward = 0;
      const startSteps = totalSteps;
      while (!state.done && running) {
        if (paused) {
          await delay(30);
          continue;
        }
        const numeric = observe(state);
        const key = qStateKey(state);
        const action = algorithm === 'q-learning' ? q!.act(key) : dqn!.act(numeric);
        const result = env.step(action);
        if (algorithm === 'q-learning') {
          q!.learn(key, action, result.reward, qStateKey(result.state), result.done);
        } else {
          dqn!.remember({
            state: numeric,
            action,
            reward: result.reward,
            nextState: observe(result.state),
            done: result.done,
          });
          if (totalSteps % 4 === 0) {
            pendingUpdate = dqn!.trainBatch();
            await pendingUpdate;
          }
        }
        totalSteps++;
        episodeReward += result.reward;
        state = result.state;
        const now = performance.now();
        if (now - lastSnapshotAt >= 80 || state.done) {
          latestStats = {
            ...latestStats!,
            episode: episodeNumber,
            totalSteps,
            episodeReward,
            status: paused ? 'paused' : 'running',
          };
          send({ type: 'stats', stats: latestStats });
        }
        if (renderAgents && (now - lastSnapshotAt >= 80 || state.done)) {
          send({
            type: 'snapshot',
            agent: {
              id,
              x: state.x,
              y: state.y,
              action,
              episode: episodeNumber,
              reward: episodeReward,
              status: state.done ? (state.success ? 'success' : 'failed') : 'running',
            },
          });
        }
        if (now - lastSnapshotAt >= 80 || state.done) lastSnapshotAt = now;
        if (speed === 'max') {
          if (totalSteps % 32 === 0) await delay(0);
        } else await delay(16 / speed);
      }
      if (!running) break;
      if (state.success) successes++;
      else failures++;
      recent.push({ reward: episodeReward, success: state.success });
      if (recent.length > 100) recent.shift();
      if (algorithm === 'q-learning') q!.finishEpisode();
      else dqn!.finishEpisode();
      const averageReward100 = recent.reduce((sum, item) => sum + item.reward, 0) / recent.length;
      const successRate100 = (100 * recent.filter((item) => item.success).length) / recent.length;
      latestStats = {
        id,
        algorithm,
        episode: episodeNumber,
        targetEpisodes: episodes,
        totalSteps,
        episodeReward,
        averageReward100,
        successRate100,
        successes,
        failures,
        epsilon: algorithm === 'q-learning' ? q!.epsilon : dqn!.epsilon,
        status: 'running',
      };
      send({ type: 'stats', stats: latestStats });
      send({
        type: 'history',
        point: {
          agentId: id,
          episode: episodeNumber,
          reward: episodeReward,
          averageReward100,
          successRate100,
          steps: totalSteps - startSteps,
          success: state.success,
        },
      });
      completedEpisode = episodeNumber;
      if (completedEpisode % EVALUATION.everyEpisodes === 0) {
        await evaluateCompletedPolicy();
        if (staleEvaluations >= EVALUATION.patience) {
          stopReason = 'no-improvement';
          break;
        }
      }
    }
    if (running) {
      // Short runs and a final partial evaluation interval still get both policies.
      if ((lastEvaluation as EvaluationResult | null)?.episode !== completedEpisode)
        await evaluateCompletedPolicy();
      if (!running) return;
      episodeNumber = completedEpisode;
      await writePolicy(`${checkpointRoot}/final`, completedEpisode, {
        kind: 'final',
        evaluation: lastEvaluation ?? undefined,
        stopReason,
      });
      send({ type: 'policy-saved', id, checkpointId: `${checkpointRoot}/final`, kind: 'final' });
      publishStatus('complete');
      send({ type: 'complete', id, reason: stopReason });
    } else publishStatus('stopped');
  } catch (error) {
    publishStatus('error');
    send({ type: 'error', id, message: error instanceof Error ? error.message : String(error) });
  } finally {
    running = false;
  }
}

async function writePolicy(
  checkpointId: string,
  episode: number,
  details?: CheckpointDetails,
): Promise<void> {
  await pendingUpdate;
  if (algorithm === 'q-learning' && q) await saveQAgent(checkpointId, q, episode, details);
  else if (dqn) {
    await dqn.online.save(dqnHandler(checkpointId));
    await saveDqnMetadata(checkpointId, episode, dqn.epsilon, details);
  } else throw new Error('No policy is available to save');
}

async function saveCheckpoint(checkpointId: string): Promise<void> {
  paused = true;
  await writePolicy(checkpointId, episodeNumber);
  send({ type: 'saved', id: workerId, checkpointId });
}

async function loadCheckpoint(checkpointId: string, selectedAlgorithm: Algorithm): Promise<void> {
  if (running) throw new Error('Pause or stop before loading a checkpoint');
  workerId ||= checkpointId.split('/').find((part) => /^AI-\d+$/.test(part)) ?? 'AI-1';
  algorithm = selectedAlgorithm;
  if (algorithm === 'q-learning') {
    const loaded = await loadQAgent(checkpointId);
    q = loaded.agent;
    episodeNumber = loaded.metadata.episode;
  } else {
    await tf.setBackend('cpu');
    await tf.ready();
    const metadata = await loadMetadata(checkpointId, 'dqn');
    const model = await tf.loadLayersModel(dqnHandler(checkpointId));
    dqn ??= new DQNAgent();
    dqn.replaceOnlineModel(model);
    dqn.epsilon = metadata.epsilon;
    episodeNumber = metadata.episode;
  }
  send({ type: 'loaded', id: workerId, checkpointId, algorithm });
}

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const command = event.data;
  if (command.type === 'start' && !running) {
    speed = command.speed;
    renderAgents = command.renderAgents ?? true;
    void train(command.id, command.algorithm, command.episodes);
  } else if (command.type === 'pause') {
    paused = true;
    publishStatus('paused');
  } else if (command.type === 'resume') {
    paused = false;
    publishStatus('running');
  } else if (command.type === 'stop') {
    running = false;
    paused = false;
  } else if (command.type === 'set-speed') speed = command.speed;
  else if (command.type === 'set-rendering') renderAgents = command.enabled;
  else if (command.type === 'save')
    void saveCheckpoint(command.checkpointId).catch((error) =>
      send({ type: 'error', id: workerId, message: String(error) }),
    );
  else if (command.type === 'load')
    void loadCheckpoint(command.checkpointId, command.algorithm).catch((error) =>
      send({ type: 'error', id: workerId, message: String(error) }),
    );
};
