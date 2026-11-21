import type { HimavantaEnvironment } from '../domain/environment';
import type { Action, AgentSnapshot } from '../domain/types';

export function humanSnapshot(env: HimavantaEnvironment, action: Action, paused = false): AgentSnapshot {
  const state = env.getState();
  return {
    id: 'HUMAN',
    x: state.x,
    y: state.y,
    action,
    episode: 1,
    reward: 0,
    status: state.done ? (state.success ? 'success' : 'failed') : paused ? 'paused' : 'running',
  };
}

export function watchSnapshot(
  env: HimavantaEnvironment,
  action: Action,
  episode: number,
  reward: number,
  paused = false,
): AgentSnapshot {
  return { ...humanSnapshot(env, action, paused), id: 'WATCH-AI', episode, reward };
}
