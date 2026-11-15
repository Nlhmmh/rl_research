export type Action = 0 | 1 | 2 | 3 | 4 | 5;

export const ACTIONS = [0, 1, 2, 3, 4, 5] as const;
export const ACTION_NAMES = ['IDLE', 'LEFT', 'RIGHT', 'JUMP', 'JUMP_LEFT', 'JUMP_RIGHT'] as const;

export type AgentId = string; // e.g. "AI-1"

export interface PlayerState {
  x: number;
  y: number; // feet coordinate
  vx: number;
  vy: number;
  grounded: boolean;
  steps: number;
  done: boolean;
  success: boolean;
}

export interface Transition {
  state: PlayerState;
  reward: number;
  done: boolean;
  success: boolean;
}

export interface AgentSnapshot {
  id: AgentId;
  x: number;
  y: number;
  action: Action;
  status: 'running' | 'success' | 'failed' | 'paused';
  episode: number;
  reward: number;
}
