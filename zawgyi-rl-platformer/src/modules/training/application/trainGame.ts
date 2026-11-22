import {
  EVALUATION,
  LEVEL,
  OBSERVATION_VERSION,
  REWARD_VERSION,
  TRAINING,
} from '../../game/domain/level';
import type { AgentSnapshot } from '../../game/domain/types';
import {
  loadManifest,
  runCheckpointId,
  type RunManifest,
  saveManifest,
} from '../../reinforcement-learning/infrastructure/persistence/checkpoints';
import type {
  AgentStats,
  Algorithm,
  HistoryPoint,
  TrainingSpeed,
  TrainingRunOptions,
  WorkerEvent,
} from '../../reinforcement-learning/infrastructure/workers/protocol';
import { TrainingManager } from '../../reinforcement-learning/infrastructure/workers/trainingManager';

export type AgentCount = 1 | 2 | 4 | 8;
export interface TrainingSettings {
  algorithm: Algorithm;
  agentCount: AgentCount;
  stepBudget: number;
  speed: TrainingSpeed;
  renderAgents?: boolean;
}

interface TrainGameCallbacks {
  onSnapshots: (snapshots: AgentSnapshot[]) => void;
  onStatsReset: () => void;
  onHistoryReset: () => void;
  onStats: (stats: AgentStats) => void;
  onHistory: (point: HistoryPoint) => void;
  onActive: (active: boolean) => void;
  onExtendAvailable: (available: boolean) => void;
  onMessage: (message: string) => void;
  onAlgorithm: (algorithm: Algorithm) => void;
  onAgentCount: (count: AgentCount) => void;
  onSpeed: (speed: TrainingSpeed) => void;
}

export function createTrainGame(callbacks: TrainGameCallbacks) {
  let loadedAlgorithm: Algorithm | null = null;
  let disposed = false;
  let saving = false;
  let loading = false;
  let operation = 0;
  let manifestWrite = Promise.resolve();
  type Completion = Extract<WorkerEvent, { type: 'complete' }>;
  let run: {
    options: TrainingRunOptions;
    completed: Map<string, Completion>;
    active: boolean;
    published: boolean;
  } | null = null;
  const pendingLoads = new Set<string>();
  const pendingSaves = new Map<
    string,
    {
      resolve: () => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  function rejectPendingSaves(message: string) {
    for (const pending of pendingSaves.values()) {
      clearTimeout(pending.timer);
      pending.reject(new Error(message));
    }
    pendingSaves.clear();
  }
  const setActive = callbacks.onActive;
  const setMessage = callbacks.onMessage;
  const setAlgorithm = callbacks.onAlgorithm;
  const setAgentCount = callbacks.onAgentCount;
  const setSpeed = callbacks.onSpeed;

  function manifest(
    runId: string,
    algorithm: Algorithm,
    checkpoints?: RunManifest['checkpoints'],
  ): RunManifest {
    return {
      schemaVersion: 1,
      runId,
      algorithm,
      levelId: LEVEL.id,
      agentIds: manager.ids(),
      checkpoints,
      observationVersion: OBSERVATION_VERSION,
      rewardVersion: REWARD_VERSION,
      saveType: 'policy-checkpoint',
      savedAt: new Date().toISOString(),
    };
  }

  function publishManifest(saved: RunManifest) {
    const write = manifestWrite.then(() => saveManifest(saved));
    manifestWrite = write.catch(() => undefined);
    return write;
  }

  async function finishRun(current: NonNullable<typeof run>) {
    const { options, completed } = current;
    const results = Array.from(completed.values());
    const solved = results.filter((result) => result.bestId).length;
    const checkpoints = Object.fromEntries(
      results.map(({ id, finalId, bestId }) => [id, { finalId, bestId }]),
    );
    try {
      await publishManifest(manifest(options.runId, options.algorithm, checkpoints));
      current.published = true;
      if (run !== current || disposed) return;
      setMessage(
        solved === results.length
          ? 'Solved. All agents reached the goal. Best and final policies saved.'
          : `Budget reached · goal not reached by ${results.length - solved} of ${results.length} agents. Policies saved.`,
      );
    } catch (error) {
      if (run === current) reportError(error);
    } finally {
      if (run === current && !disposed) {
        current.active = false;
        callbacks.onExtendAvailable(solved < results.length);
        setActive(false);
      }
    }
  }

  function reportError(error: unknown) {
    if (!disposed) setMessage(error instanceof Error ? error.message : String(error));
  }

  function handleEvent(event: WorkerEvent) {
    if (disposed) return;
    if (event.type === 'evaluation') {
      const outcome = event.result.success
        ? `goal reached in ${event.result.steps} steps`
        : 'goal not reached';
      const best = event.best
        ? `${event.best.steps} steps at episode ${event.best.episode}`
        : 'no successful policy yet';
      const progress = event.best
        ? `Evaluations without improvement: ${event.staleEvaluations}/${EVALUATION.patience}.`
        : 'Looking for the first successful policy.';
      setMessage(
        `${event.id}: evaluation at episode ${event.result.episode}: ${outcome}. Best: ${best}. ${progress}`,
      );
    }
    if (event.type === 'error') {
      rejectPendingSaves(event.message);
      if (pendingLoads.size || run?.active) {
        pendingLoads.clear();
        loading = false;
        loadedAlgorithm = null;
        run = null;
        manager.stop();
        callbacks.onExtendAvailable(false);
        setActive(false);
      }
      setMessage(event.message);
    }
    if (event.type === 'complete' && run?.options.runId === event.runId) {
      if (run.completed.has(event.id)) return;
      run.completed.set(event.id, event);
      if (manager.ids().every((id) => run?.completed.has(id))) void finishRun(run);
    }
    if (event.type === 'saved') {
      const pending = pendingSaves.get(event.checkpointId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingSaves.delete(event.checkpointId);
        pending.resolve();
      }
    }
    if (event.type === 'loaded' && pendingLoads.delete(event.id) && !pendingLoads.size) {
      loadedAlgorithm = event.algorithm;
      loading = false;
      setActive(false);
      setMessage('Loaded latest policy weights. Start to train with a new step budget.');
    }
  }

  const manager = new TrainingManager({
    onSnapshots: callbacks.onSnapshots,
    onStats: callbacks.onStats,
    onHistory: callbacks.onHistory,
    onEvent: handleEvent,
  });

  function start(settings: TrainingSettings) {
    if (disposed || saving || loading || run?.active) return;
    const { algorithm, agentCount, stepBudget, speed, renderAgents } = settings;
    const options = {
      runId: `run-${crypto.randomUUID()}`,
      algorithm,
      stepBudget: Math.min(TRAINING.maxStepBudget, Math.max(1, Math.floor(stepBudget) || 1)),
      speed,
      renderAgents,
    };
    run = { options, completed: new Map(), active: true, published: false };
    callbacks.onExtendAvailable(false);
    callbacks.onStatsReset();
    callbacks.onHistoryReset();
    setActive(true);
    const useLoaded = loadedAlgorithm === algorithm && manager.ids().length === agentCount;
    loadedAlgorithm = null;
    setMessage(useLoaded ? 'Continuing from loaded policy weights.' : 'Training started.');
    if (useLoaded) {
      manager.ids().forEach((id) => manager.send(id, { type: 'start', id, ...options }));
    } else {
      manager.start(agentCount, options);
    }
  }

  function extend(additionalSteps: number) {
    if (disposed || saving || loading || !run || run.active) return;
    const { options, completed } = run;
    const unsolved = Array.from(completed.values()).filter((result) => !result.bestId);
    if (!unsolved.length) return;
    options.stepBudget += Math.min(
      TRAINING.maxStepBudget,
      Math.max(1, Math.floor(additionalSteps) || 1),
    );
    run.active = true;
    run.published = false;
    setActive(true);
    setMessage('Continuing training for agents that have yet to reach the goal.');
    for (const { id } of unsolved) {
      completed.delete(id);
      manager.send(id, { type: 'start', id, ...options });
    }
  }

  function pause() {
    if (!run?.active) return;
    manager.broadcast({ type: 'pause' });
    setMessage('Training paused.');
  }
  function resume() {
    if (!run?.active || saving) return;
    manager.broadcast({ type: 'resume' });
    setMessage('Training resumed.');
  }
  function stop() {
    operation++;
    run = null;
    loading = false;
    pendingLoads.clear();
    rejectPendingSaves('Training stopped before saving finished.');
    manager.stop();
    setActive(false);
    loadedAlgorithm = null;
    callbacks.onExtendAvailable(false);
    setMessage('Training stopped. Saved checkpoints are available in Watch AI.');
  }
  function updateSpeed(value: TrainingSpeed) {
    setSpeed(value);
    if (run) run.options.speed = value;
    manager.broadcast({ type: 'set-speed', speed: value });
  }

  function setRendering(enabled: boolean) {
    if (run) run.options.renderAgents = enabled;
    manager.broadcast({ type: 'set-rendering', enabled });
    if (!enabled) callbacks.onSnapshots([]);
  }

  async function save(algorithm: Algorithm) {
    if (disposed || saving || loading) return;
    if (run && manager.ids().every((id) => run?.completed.has(id))) {
      if (!run.active && !run.published) {
        run.active = true;
        setActive(true);
        await finishRun(run);
      } else {
        setMessage(
          run.active ? 'Recording completed training…' : 'Final policies have already been saved.',
        );
      }
      return;
    }
    const version = operation;
    const ids = manager.ids();
    if (!ids.length) {
      setMessage('Start or load agents before saving.');
      return;
    }
    manager.broadcast({ type: 'pause' });
    saving = true;
    setMessage('Saving policy checkpoints…');
    const current = run;
    const runId = current?.options.runId ?? `run-${crypto.randomUUID()}`;
    const checkpoints = Object.fromEntries(
      ids.map((id) => {
        const completed = current?.completed.get(id);
        return [
          id,
          {
            finalId: completed?.finalId ?? `${runId}/${id}/manual`,
            bestId: completed?.bestId,
          },
        ];
      }),
    );
    try {
      await Promise.all(
        ids
          .filter((id) => !current?.completed.has(id))
          .map(
            (id) =>
              new Promise<void>((resolve, reject) => {
                const checkpointId = checkpoints[id].finalId;
                const timer = setTimeout(() => {
                  pendingSaves.delete(checkpointId);
                  reject(new Error(`Saving ${id} timed out. The previous saved run is unchanged.`));
                }, 30_000);
                pendingSaves.set(checkpointId, { resolve, reject, timer });
                manager.send(id, { type: 'save', checkpointId });
              }),
          ),
      );
      if (disposed || operation !== version || ids.every((id) => current?.completed.has(id)))
        return;
      await publishManifest(
        manifest(runId, current?.options.algorithm ?? loadedAlgorithm ?? algorithm, checkpoints),
      );
      if (operation === version && !disposed && !ids.every((id) => current?.completed.has(id))) {
        setMessage('All agent policies saved. Training is paused.');
      }
    } catch (error) {
      rejectPendingSaves('Save cancelled after a checkpoint failed.');
      if (operation === version) reportError(error);
    } finally {
      saving = false;
    }
  }

  async function load() {
    if (disposed || loading || saving || run?.active) return;
    const version = ++operation;
    loading = true;
    setActive(true);
    try {
      const saved = await loadManifest();
      if (disposed || operation !== version) return;
      run = null;
      callbacks.onExtendAvailable(false);
      loadedAlgorithm = null;
      setAlgorithm(saved.algorithm);
      setAgentCount(saved.agentIds.length as AgentCount);
      callbacks.onStatsReset();
      callbacks.onHistoryReset();
      manager.prepare(saved.agentIds);
      for (const id of saved.agentIds) pendingLoads.add(id);
      setMessage('Loading latest policy checkpoint…');
      saved.agentIds.forEach((id) =>
        manager.send(id, {
          type: 'load',
          checkpointId: runCheckpointId(saved, id),
          algorithm: saved.algorithm,
        }),
      );
    } catch (error) {
      if (disposed || operation !== version) return;
      loading = false;
      setActive(false);
      reportError(error);
    }
  }

  function dispose() {
    disposed = true;
    rejectPendingSaves('Training screen closed before saving finished.');
    manager.dispose();
  }

  return { start, extend, pause, resume, stop, updateSpeed, setRendering, save, load, dispose };
}
