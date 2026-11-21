import { expect, it, vi } from 'vitest';
import type { WorkerCommand, WorkerEvent } from './protocol';

const storage = vi.hoisted(() => ({ saveQAgent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../persistence/checkpoints', () => ({
  saveQAgent: storage.saveQAgent,
  saveDqnMetadata: vi.fn(),
  dqnHandler: vi.fn(),
  loadMetadata: vi.fn(),
  loadQAgent: vi.fn(),
}));
vi.mock('../game/environment', () => ({
  HimavantaEnvironment: class {
    reset() {
      return { x: 80, y: 420, vx: 0, vy: 0, grounded: true, steps: 0, done: false, success: false };
    }
    step() {
      return {
        state: { ...this.reset(), done: true, steps: 1 },
        reward: -40,
        done: true,
        success: false,
      };
    }
  },
}));

it('evaluates every 100 episodes, stops at five stale evaluations, and retains best/final', async () => {
  const events: WorkerEvent[] = [];
  const worker = {
    onmessage: null as ((event: MessageEvent<WorkerCommand>) => void) | null,
    postMessage: (event: WorkerEvent) => {
      events.push(event);
    },
  };
  vi.stubGlobal('self', worker);
  try {
    await import('./trainer.worker');
    worker.onmessage!({
      data: {
        type: 'start',
        id: 'AI-1',
        algorithm: 'q-learning',
        episodes: 1000,
        speed: 'max',
        renderAgents: false,
      },
    } as MessageEvent<WorkerCommand>);
    await vi.waitFor(() => expect(events.some((event) => event.type === 'complete')).toBe(true));
    const evaluations = events.filter((event) => event.type === 'evaluation');
    expect(evaluations.map((event) => event.result.episode)).toEqual([
      100, 200, 300, 400, 500, 600,
    ]);
    expect(events).toContainEqual({ type: 'complete', id: 'AI-1', reason: 'no-improvement' });
    expect(storage.saveQAgent).toHaveBeenCalledTimes(2);
    const [best, final] = storage.saveQAgent.mock.calls;
    expect(best[0]).toMatch(/AI-1\/best$/);
    expect(best[2]).toBe(100);
    expect(best[3].kind).toBe('best');
    expect(final[0]).toMatch(/AI-1\/final$/);
    expect(final[2]).toBe(600);
    expect(final[3].stopReason).toBe('no-improvement');
  } finally {
    vi.unstubAllGlobals();
  }
});
