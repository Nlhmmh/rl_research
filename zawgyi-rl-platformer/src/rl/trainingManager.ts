import type { AgentSnapshot } from '../game/types';
import type {
  AgentStats,
  Algorithm,
  HistoryPoint,
  TrainingSpeed,
  WorkerCommand,
  WorkerEvent,
} from './protocol';

export interface TrainingCallbacks {
  onSnapshots: (snapshots: AgentSnapshot[]) => void;
  onStats: (stats: AgentStats) => void;
  onHistory: (point: HistoryPoint) => void;
  onEvent?: (event: WorkerEvent) => void;
}

export class TrainingManager {
  private workers = new Map<string, Worker>();
  private latest = new Map<string, AgentSnapshot>();
  private readonly callbacks: TrainingCallbacks;
  constructor(callbacks: TrainingCallbacks) {
    this.callbacks = callbacks;
  }

  start(
    agentCount: 1 | 2 | 4 | 8,
    algorithm: Algorithm,
    episodes: number,
    speed: TrainingSpeed,
    renderAgents = true,
  ): void {
    this.stop();
    for (let index = 0; index < agentCount; index++) {
      const id = `AI-${index + 1}`;
      const worker = this.makeWorker(id);
      worker.postMessage({ type: 'start', id, algorithm, episodes, speed, renderAgents } satisfies WorkerCommand);
    }
  }

  prepare(agentIds: string[]): void {
    this.stop();
    agentIds.forEach((id) => this.makeWorker(id));
  }

  private makeWorker(id: string): Worker {
    const worker = new Worker(new URL('./trainer.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      const message = event.data;
      if (message.type === 'snapshot') {
        this.latest.set(message.agent.id, message.agent);
        this.callbacks.onSnapshots([...this.latest.values()]);
      } else if (message.type === 'stats') this.callbacks.onStats(message.stats);
      else if (message.type === 'history') this.callbacks.onHistory(message.point);
      this.callbacks.onEvent?.(message);
    };
    worker.onerror = (error) =>
      this.callbacks.onEvent?.({ type: 'error', id, message: error.message || 'Worker failed' });
    this.workers.set(id, worker);
    return worker;
  }

  send(id: string, command: WorkerCommand): void {
    this.workers.get(id)?.postMessage(command);
  }
  broadcast(command: WorkerCommand): void {
    for (const worker of this.workers.values()) worker.postMessage(command);
  }
  ids(): string[] {
    return [...this.workers.keys()];
  }
  stop(): void {
    for (const worker of this.workers.values()) worker.terminate();
    this.workers.clear();
    this.latest.clear();
    this.callbacks.onSnapshots([]);
  }
  dispose(): void {
    this.stop();
  }
}
