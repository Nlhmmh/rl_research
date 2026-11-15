import type { AgentSnapshot } from '../game/types';

export type Algorithm = 'q-learning' | 'dqn';
export type TrainingSpeed = 1 | 2 | 4 | 'max';
export type TrainingStatus = 'idle' | 'running' | 'paused' | 'complete' | 'stopped' | 'error';

export interface AgentStats {
  id: string;
  algorithm: Algorithm;
  episode: number;
  targetEpisodes: number;
  totalSteps: number;
  episodeReward: number;
  averageReward100: number;
  successRate100: number;
  successes: number;
  failures: number;
  epsilon: number;
  status: TrainingStatus;
}

export interface HistoryPoint {
  agentId: string;
  episode: number;
  reward: number;
  averageReward100: number;
  successRate100: number;
  steps: number;
  success: boolean;
}

export type WorkerCommand =
  | { type: 'start'; id: string; algorithm: Algorithm; episodes: number; speed: TrainingSpeed; renderAgents?: boolean }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'set-speed'; speed: TrainingSpeed }
  | { type: 'set-rendering'; enabled: boolean }
  | { type: 'save'; checkpointId: string }
  | { type: 'load'; checkpointId: string; algorithm: Algorithm };

export type WorkerEvent =
  | { type: 'snapshot'; agent: AgentSnapshot }
  | { type: 'stats'; stats: AgentStats }
  | { type: 'history'; point: HistoryPoint }
  | { type: 'saved'; id: string; checkpointId: string }
  | { type: 'loaded'; id: string; checkpointId: string; algorithm: Algorithm }
  | { type: 'complete'; id: string }
  | { type: 'error'; id: string; message: string };
