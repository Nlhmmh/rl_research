import type { AgentSnapshot } from '../../../game/domain/types';
import type { EvaluationResult } from '../../application/evaluation';

export type Algorithm = 'q-learning' | 'dqn';
export type TrainingSpeed = 1 | 2 | 4 | 'max';
export type TrainingStatus = 'idle' | 'running' | 'paused' | 'complete' | 'stopped' | 'error';
export type TrainingStopReason = 'step-budget' | 'no-improvement';

export interface TrainingRunOptions {
  runId: string;
  algorithm: Algorithm;
  stepBudget: number;
  speed: TrainingSpeed;
  renderAgents?: boolean;
}

export interface AgentStats {
  id: string;
  algorithm: Algorithm;
  episode: number;
  stepBudget: number;
  totalSteps: number;
  latestEvaluation?: EvaluationResult;
  bestEvaluation?: EvaluationResult;
  stopReason?: TrainingStopReason;
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
  | ({ type: 'start'; id: string } & TrainingRunOptions)
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'set-speed'; speed: TrainingSpeed }
  | { type: 'set-rendering'; enabled: boolean }
  | { type: 'save'; checkpointId: string }
  | { type: 'load'; checkpointId: string; algorithm: Algorithm };

export type WorkerEvent =
  | {
      type: 'evaluation';
      id: string;
      result: EvaluationResult;
      best: EvaluationResult | null;
      staleEvaluations: number;
    }
  | { type: 'snapshot'; agent: AgentSnapshot }
  | { type: 'stats'; stats: AgentStats }
  | { type: 'history'; point: HistoryPoint }
  | { type: 'saved'; id: string; checkpointId: string }
  | { type: 'loaded'; id: string; checkpointId: string; algorithm: Algorithm }
  | {
      type: 'complete';
      id: string;
      runId: string;
      reason: TrainingStopReason;
      finalId: string;
      bestId?: string;
    }
  | { type: 'error'; id: string; message: string };
