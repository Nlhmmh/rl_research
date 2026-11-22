/// <reference lib="webworker" />
import * as tf from '@tensorflow/tfjs';
import type { PlayerState } from '../../../game/domain/types';
import { HimavantaEnvironment } from '../../../game/domain/environment';
import { observe } from '../../domain/policies/observation';
import { qStateKey } from '../algorithms/q-learning/observation-q';
import { EVALUATION, TIMING } from '../../../game/domain/level';
import {
  evaluatePolicy,
  isBetterEvaluation,
  type EvaluationResult,
} from '../../application/evaluation';
import type { CheckpointDetails } from '../persistence/checkpoints';
import {
  dqnHandler,
  loadMetadata,
  loadQAgent,
  saveDqnAgent,
  saveQAgent,
} from '../persistence/checkpoints';
import { DQNAgent } from '../algorithms/dqn/DQNAgent';
import { QLearningAgent } from '../algorithms/q-learning/QLearningAgent';
import type {
  AgentStats,
  Algorithm,
  TrainingSpeed,
  TrainingStopReason,
  WorkerCommand,
  WorkerEvent,
} from './protocol';

const send = (event: WorkerEvent) => self.postMessage(event);
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
let running = false;
let busy = false;
let paused = false;
let renderAgents = true;
let speed: TrainingSpeed = 1;
let q: QLearningAgent | null = null;
let dqn: DQNAgent | null = null;
let workerId = '';
let algorithm: Algorithm = 'q-learning';
let episodeNumber = 0;
let latestStats: AgentStats | null = null;
let continuation:
  | {
      runId: string;
      env: HimavantaEnvironment;
      state: PlayerState;
      episodeReward: number;
      startSteps: number;
    }
  | undefined;
const recent: Array<{ reward: number; success: boolean }> = [];
let pendingUpdate: Promise<void> = Promise.resolve();

function publishStatus(status: AgentStats['status']): void {
  if (!latestStats) return;
  latestStats = { ...latestStats, status };
  send({ type: 'stats', stats: latestStats });
}

async function initializeAgent() {
  if (algorithm === 'q-learning') q ??= new QLearningAgent();
  else if (!dqn) {
    await tf.setBackend('cpu');
    await tf.ready();
    dqn = new DQNAgent();
  }
}

async function train({
  id,
  algorithm: selectedAlgorithm,
  stepBudget,
  runId,
}: Extract<WorkerCommand, { type: 'start' }>) {
  busy = true;
  running = true;
  paused = false;
  workerId = id;
  algorithm = selectedAlgorithm;
  latestStats = {
    latestEvaluation: latestStats?.latestEvaluation,
    id,
    algorithm,
    episode: episodeNumber,
    stepBudget,
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
    const checkpointRoot = `${runId}/${id}`;
    const bestId = `${checkpointRoot}/best`;
    const finalId = `${checkpointRoot}/final`;
    let best: EvaluationResult | null = null;
    let finalEvaluation: EvaluationResult | undefined;
    let staleEvaluations = 0;
    let completedEpisode = episodeNumber;
    let stopReason: TrainingStopReason = 'step-budget';

    async function evaluateCompletedPolicy() {
      let evaluationSteps = 0;
      const result = await evaluatePolicy(
        completedEpisode,
        (state) =>
          algorithm === 'q-learning'
            ? q!.act(qStateKey(state), false)
            : dqn!.act(observe(state), false),
        async () => {
          if (++evaluationSteps % TIMING.maxSpeedYieldSteps === 0) await delay(0);
          while (paused && running) await delay(TIMING.pausedPollMs);
          return running;
        },
      );
      if (!result || !running) return;
      if (isBetterEvaluation(result, best)) {
        await writePolicy(bestId, completedEpisode, {
          kind: 'best',
          evaluation: result,
          totalSteps: latestStats!.totalSteps,
        });
        if (!running) return;
        best = result;
        staleEvaluations = 0;
      } else if (best?.success) staleEvaluations++;
      latestStats = {
        ...latestStats!,
        latestEvaluation: result,
        bestEvaluation: best ?? undefined,
      };
      send({ type: 'stats', stats: latestStats });
      send({ type: 'evaluation', id, result, best, staleEvaluations });
      return result;
    }
    const previous = continuation?.runId === runId ? continuation : undefined;
    const env = previous?.env ?? new HimavantaEnvironment();
    pendingUpdate = initializeAgent();
    await pendingUpdate;
    let totalSteps = latestStats?.totalSteps ?? 0;
    let successes = latestStats?.successes ?? 0;
    let failures = latestStats?.failures ?? 0;
    let lastSnapshotAt = 0;
    for (episodeNumber = (episodeNumber || 0) + 1; running; episodeNumber++) {
      const partial = continuation?.runId === runId ? continuation : undefined;
      continuation = undefined;
      let state = partial?.state ?? env.reset();
      let episodeReward = partial?.episodeReward ?? 0;
      const startSteps = partial?.startSteps ?? totalSteps;
      while (!state.done && running && totalSteps < stepBudget) {
        if (paused) {
          await delay(TIMING.pausedPollMs);
          continue;
        }
        let action;
        let result;
        if (algorithm === 'q-learning') {
          const key = qStateKey(state);
          action = q!.act(key);
          result = env.step(action);
          q!.learn(key, action, result.reward, qStateKey(result.state), result.done);
        } else {
          const numeric = observe(state);
          action = dqn!.act(numeric);
          result = env.step(action);
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
        if (now - lastSnapshotAt >= TIMING.workerSnapshotMs || state.done) {
          latestStats = {
            ...latestStats!,
            episode: episodeNumber,
            totalSteps,
            episodeReward,
            status: paused ? 'paused' : 'running',
          };
          send({ type: 'stats', stats: latestStats });
        }
        if (renderAgents && (now - lastSnapshotAt >= TIMING.workerSnapshotMs || state.done)) {
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
        if (now - lastSnapshotAt >= TIMING.workerSnapshotMs || state.done) lastSnapshotAt = now;
        if (speed === 'max') {
          if (totalSteps % TIMING.maxSpeedYieldSteps === 0) await delay(0);
        } else await delay(TIMING.tickMs / speed);
      }
      if (!running) break;
      if (state.done) {
        if (state.success) successes++;
        else failures++;
        recent.push({ reward: episodeReward, success: state.success });
        if (recent.length > 100) recent.shift();
        if (algorithm === 'q-learning') q!.finishEpisode();
        else dqn!.finishEpisode();
        const averageReward100 = recent.reduce((sum, item) => sum + item.reward, 0) / recent.length;
        const successRate100 = (100 * recent.filter((item) => item.success).length) / recent.length;
        latestStats = {
          ...latestStats!,
          episode: episodeNumber,
          totalSteps,
          episodeReward,
          averageReward100,
          successRate100,
          successes,
          failures,
          epsilon: algorithm === 'q-learning' ? q!.epsilon : dqn!.epsilon,
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
      }
      const atBudget = totalSteps >= stepBudget;
      if (atBudget && !state.done) continuation = { runId, env, state, episodeReward, startSteps };
      if (!atBudget && completedEpisode % EVALUATION.everyEpisodes !== 0) continue;
      latestStats = { ...latestStats!, totalSteps, episode: completedEpisode };
      const evaluation = await evaluateCompletedPolicy();
      if (!evaluation) break;

      if (atBudget || staleEvaluations >= EVALUATION.patience) {
        finalEvaluation = evaluation;
        if (!atBudget) stopReason = 'no-improvement';
        break;
      }
    }
    if (running) {
      episodeNumber = completedEpisode;
      await writePolicy(finalId, completedEpisode, {
        kind: 'final',
        evaluation: finalEvaluation,
        stopReason,
        totalSteps,
      });
      if (!running) return;
      latestStats = { ...latestStats!, stopReason };
      publishStatus('complete');
      send({
        type: 'complete',
        id,
        runId,
        reason: stopReason,
        finalId,
        bestId: best ? bestId : undefined,
      });
    } else publishStatus('stopped');
  } catch (error) {
    publishStatus('error');
    send({ type: 'error', id, message: error instanceof Error ? error.message : String(error) });
  } finally {
    running = false;
    busy = false;
  }
}

async function writePolicy(
  checkpointId: string,
  episode: number,
  details?: CheckpointDetails,
): Promise<void> {
  await pendingUpdate;
  if (algorithm === 'q-learning' && q) await saveQAgent(checkpointId, q, episode, details);
  else if (dqn) await saveDqnAgent(checkpointId, dqn, episode, details);
  else throw new Error('No policy is available to save');
}

async function saveCheckpoint(checkpointId: string): Promise<void> {
  paused = true;
  await writePolicy(checkpointId, episodeNumber);
  send({ type: 'saved', id: workerId, checkpointId });
}

async function loadCheckpoint(checkpointId: string, selectedAlgorithm: Algorithm): Promise<void> {
  if (busy) throw new Error('Pause or stop before loading a checkpoint');
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
  if (command.type === 'start' && !busy) {
    speed = command.speed;
    renderAgents = command.renderAgents ?? true;
    void train(command);
  } else if (command.type === 'pause') {
    paused = true;
    if (running) publishStatus('paused');
  } else if (command.type === 'resume') {
    paused = false;
    if (running) publishStatus('running');
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
