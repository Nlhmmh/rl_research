import { HimavantaEnvironment } from '../../modules/game/domain/environment';
import { FIXED_DT, TIMING } from '../../modules/game/domain/level';
import { humanSnapshot } from '../../modules/game/application/snapshot';
import { ACTION, type Action, type AgentSnapshot } from '../../modules/game/domain/types';
import { actionFromKeys, commandFromKey, shouldPreventDefault } from './keyboard-controller';

export type Outcome = 'success' | 'failed' | null;

interface HumanGameCallbacks {
  onPause: (paused: boolean) => void;
  onOutcome: (outcome: Outcome) => void;
  onSnapshot: (snapshots: AgentSnapshot[]) => void;
}

export function createHumanGame(callbacks: HumanGameCallbacks) {
  const env = new HimavantaEnvironment();
  const keys = new Set<string>();
  let paused = false;
  let raf = 0;
  let previous = performance.now();
  let accumulated = 0;
  let lastPublished = 0;
  let lastAction: Action = ACTION.IDLE;

  function publishSnapshot() {
    callbacks.onSnapshot([humanSnapshot(env, lastAction, paused)]);
  }

  function resetClock() {
    previous = performance.now();
    accumulated = 0;
  }

  function togglePause() {
    paused = !paused;
    resetClock();
    callbacks.onPause(paused);
    publishSnapshot();
  }

  function restart() {
    env.reset();
    keys.clear();
    paused = false;
    lastAction = ACTION.IDLE;
    resetClock();
    callbacks.onPause(false);
    callbacks.onOutcome(null);
    publishSnapshot();
  }

  // Handle key events for controlling the game.
  // Prevent default browser behavior for relevant keys to avoid scrolling, etc.
  function handleKeyDown(event: KeyboardEvent) {
    if (
      event.target instanceof HTMLElement &&
      event.target.closest('input, textarea, select, [contenteditable="true"]')
    )
      return;

    if (shouldPreventDefault(event.code)) event.preventDefault();
    const command = commandFromKey(event.code);
    if (command) {
      if (!event.repeat) {
        if (command === 'restart') restart();
        else togglePause();
      }
      return;
    }

    keys.add(event.code);
  }

  // Handle keyup events to stop movement when keys are released.
  function handleKeyUp(event: KeyboardEvent) {
    keys.delete(event.code);
  }

  function clearKeys() {
    keys.clear();
  }

  // Advance the simulation in fixed time steps, up to a maximum number of steps per frame.
  function advanceSimulation() {
    let steps = 0;
    while (accumulated >= FIXED_DT && !env.getState().done && steps < TIMING.maxStepsPerFrame) {
      lastAction = actionFromKeys(keys);
      const result = env.step(lastAction);
      accumulated -= FIXED_DT;
      steps++;
      if (result.done) {
        callbacks.onOutcome(result.success ? 'success' : 'failed');
        accumulated = 0;
        publishSnapshot();
        break;
      }
    }
    if (steps >= TIMING.maxStepsPerFrame) accumulated = 0;
  }

  // The main animation frame loop, which advances the simulation and publishes snapshots at regular intervals.
  function frame(now: number) {
    const elapsed = Math.min((now - previous) / TIMING.millisecondsPerSecond, TIMING.maxFrameDelta);
    previous = now;
    if (paused) accumulated = 0;
    else {
      accumulated += elapsed;
      advanceSimulation();
    }
    if (now - lastPublished >= TIMING.humanSnapshotMs) {
      publishSnapshot();
      lastPublished = now;
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    env.reset();
    resetClock();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);
    raf = requestAnimationFrame(frame);
  }

  function dispose() {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', clearKeys);
    clearKeys();
  }

  return { start, dispose, togglePause, restart };
}
