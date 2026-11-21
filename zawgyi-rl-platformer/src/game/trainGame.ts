import { LEVEL, OBSERVATION_VERSION } from './level';
import type { AgentSnapshot } from './types';
import { loadManifest, saveManifest } from '../persistence/checkpoints';
import type {
  AgentStats,
  Algorithm,
  HistoryPoint,
  TrainingSpeed,
  WorkerEvent,
} from '../rl/protocol';
import { TrainingManager } from '../rl/trainingManager';

export type AgentCount = 1 | 2 | 4 | 8;
export interface TrainingSettings {
  algorithm: Algorithm;
  agentCount: AgentCount;
  episodes: number;
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
  onMessage: (message: string) => void;
  onAlgorithm: (algorithm: Algorithm) => void;
  onAgentCount: (count: AgentCount) => void;
  onSpeed: (speed: TrainingSpeed) => void;
}

export function createTrainGame(callbacks: TrainGameCallbacks) {
  let loadedPolicies = false;
  let disposed = false;
  let saving = false;
  let runAlgorithm: Algorithm | null = null;
  const completedAgents = new Set<string>();
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

  function reportError(error: unknown) {
    if (!disposed) setMessage(error instanceof Error ? error.message : String(error));
  }

  function handleEvent(event: WorkerEvent) {
    if (disposed) return;
    if (event.type === 'evaluation') {
      const outcome = event.result.success
        ? `goal reached in ${event.result.steps} steps`
        : 'goal not reached';
      const best = event.best.success
        ? `${event.best.steps} steps at episode ${event.best.episode}`
        : 'no successful policy yet';
      setMessage(
        `${event.id}: evaluation at episode ${event.result.episode}: ${outcome}. Best: ${best}. No improvement: ${event.staleEvaluations}/5.`,
      );
    }
    if (event.type === 'error') {
      rejectPendingSaves(event.message);
      setMessage(event.message);
    }
    if (event.type === 'complete') {
      if (completedAgents.has(event.id)) return;
      completedAgents.add(event.id);
      setMessage(
        event.reason === 'no-improvement'
          ? `${event.id} stopped after five evaluations without improvement. Best and final policies saved.`
          : `${event.id} completed training. Best and final policies saved.`,
      );
      const ids = manager.ids();
      if (runAlgorithm && ids.length && ids.every((id) => completedAgents.has(id))) {
        void save(runAlgorithm, true);
      }
    }
    if (event.type === 'saved') {
      const pending = pendingSaves.get(event.checkpointId);
      if (pending) {
        clearTimeout(pending.timer);
        pendingSaves.delete(event.checkpointId);
        pending.resolve();
      }
    }
    if (event.type === 'loaded') setMessage(`Loaded ${event.id}. Start to continue training.`);
  }

  const manager = new TrainingManager({
    onSnapshots: callbacks.onSnapshots,
    onStats: callbacks.onStats,
    onHistory: callbacks.onHistory,
    onEvent: handleEvent,
  });

  function start(settings: TrainingSettings) {
    rejectPendingSaves('Training restarted before saving finished.');
    const { algorithm, agentCount, episodes, speed, renderAgents = true } = settings;
    runAlgorithm = algorithm;
    completedAgents.clear();
    setActive(true);
    setMessage(loadedPolicies ? 'Continuing from loaded policy weights.' : 'Training started.');
    if (loadedPolicies) {
      manager.ids().forEach((id) =>
        manager.send(id, {
          type: 'start',
          id,
          algorithm,
          episodes: Math.max(1, episodes),
          speed,
          renderAgents,
        }),
      );
      loadedPolicies = false;
    } else {
      callbacks.onStatsReset();
      callbacks.onHistoryReset();
      manager.start(agentCount, algorithm, Math.max(1, episodes), speed, renderAgents);
    }
  }
  function pause() {
    manager.broadcast({ type: 'pause' });
    setMessage('Training paused.');
  }
  function resume() {
    manager.broadcast({ type: 'resume' });
    setMessage('Training resumed.');
  }
  function stop() {
    runAlgorithm = null;
    completedAgents.clear();
    rejectPendingSaves('Training stopped before saving finished.');
    manager.stop();
    setActive(false);
    loadedPolicies = false;
    setMessage('Stopped; unsaved in-memory progress was discarded.');
  }
  function updateSpeed(value: TrainingSpeed) {
    setSpeed(value);
    manager.broadcast({ type: 'set-speed', speed: value });
  }

  function setRendering(enabled: boolean) {
    manager.broadcast({ type: 'set-rendering', enabled });
    if (!enabled) callbacks.onSnapshots([]);
  }

  async function save(algorithm: Algorithm, automatic = false) {
    if (disposed) return;
    // A manual save already in progress predates completion; queue a new final
    // checkpoint after its acknowledgements rather than skipping the autosave.
    if (saving) {
      if (automatic) {
        await new Promise<void>((resolve) => {
          const check = () => {
            if (!saving || disposed) resolve();
            else setTimeout(check, 50);
          };
          check();
        });
        if (!disposed && runAlgorithm === algorithm) await save(algorithm, true);
      }
      return;
    }
    const ids = manager.ids();
    if (!ids.length) {
      setMessage('Start or load agents before saving.');
      return;
    }
    manager.broadcast({ type: 'pause' });
    saving = true;
    setMessage(
      automatic
        ? 'Training complete. Saving policies automatically…'
        : 'Saving policy checkpoints…',
    );
    const runId = `run-${crypto.randomUUID()}`;
    try {
      await Promise.all(
        ids.map(
          (id) =>
            new Promise<void>((resolve, reject) => {
              const checkpointId = `${runId}/${id}`;
              const timer = setTimeout(() => {
                pendingSaves.delete(checkpointId);
                reject(new Error(`Saving ${id} timed out. The previous saved run is unchanged.`));
              }, 30_000);
              pendingSaves.set(checkpointId, { resolve, reject, timer });
              manager.send(id, { type: 'save', checkpointId });
            }),
        ),
      );
      if (disposed) return;
      await saveManifest({
        schemaVersion: 1,
        runId,
        algorithm,
        levelId: LEVEL.id,
        agentIds: ids,
        observationVersion: OBSERVATION_VERSION,
        rewardVersion: 'v2',
        saveType: 'policy-checkpoint',
        savedAt: new Date().toISOString(),
      });
      setMessage(
        automatic
          ? 'Training complete. All agent policies saved automatically.'
          : 'All agent policies saved. Training is paused.',
      );
    } catch (error) {
      rejectPendingSaves('Save cancelled after a checkpoint failed.');
      reportError(error);
    } finally {
      saving = false;
      if (automatic && !disposed) setActive(false);
    }
  }

  async function load() {
    runAlgorithm = null;
    completedAgents.clear();
    rejectPendingSaves('Loading another run cancelled the save.');
    try {
      const manifest = await loadManifest();
      if (disposed) return;
      setAlgorithm(manifest.algorithm);
      setAgentCount(manifest.agentIds.length as 1 | 2 | 4 | 8);
      manager.prepare(manifest.agentIds);
      manifest.agentIds.forEach((id) =>
        manager.send(id, {
          type: 'load',
          checkpointId: `${manifest.runId}/${id}`,
          algorithm: manifest.algorithm,
        }),
      );
      setActive(false);
      loadedPolicies = true;
      setMessage('Loading latest policy checkpoint…');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  function dispose() {
    disposed = true;
    rejectPendingSaves('Training screen closed before saving finished.');
    manager.dispose();
  }

  return { start, pause, resume, stop, updateSpeed, setRendering, save, load, dispose };
}
