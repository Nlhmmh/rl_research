// IDs are also Q-table and DQN output indices, so keep their order stable.
export const ACTION = {
  IDLE: 0,
  LEFT: 1,
  RIGHT: 2,
  JUMP: 3,
  JUMP_LEFT: 4,
  JUMP_RIGHT: 5,
} as const;
export type Action = (typeof ACTION)[keyof typeof ACTION];
export const ACTIONS = Object.values(ACTION);
export const ACTION_NAMES = ['IDLE', 'LEFT', 'RIGHT', 'JUMP', 'JUMP_LEFT', 'JUMP_RIGHT'] as const;

export function horizontalDirection(action: Action): -1 | 0 | 1 {
  if (action === ACTION.LEFT || action === ACTION.JUMP_LEFT) return -1;
  if (action === ACTION.RIGHT || action === ACTION.JUMP_RIGHT) return 1;
  return 0;
}

export function isJumpAction(action: Action): boolean {
  return action === ACTION.JUMP || action === ACTION.JUMP_LEFT || action === ACTION.JUMP_RIGHT;
}

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
