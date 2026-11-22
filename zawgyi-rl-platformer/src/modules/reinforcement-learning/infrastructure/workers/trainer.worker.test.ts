import { expect, it, vi } from 'vitest';
import type { WorkerCommand, WorkerEvent } from './protocol';

const storage = vi.hoisted(() => ({ saveQAgent: vi.fn().mockResolvedValue(undefined) }));
const evaluation = vi.hoisted(() => ({ succeeds: (_episode: number): boolean => false }));
vi.mock('../../application/evaluation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../application/evaluation')>()),
  evaluatePolicy: async (episode: number) => ({
    episode,
    success: evaluation.succeeds(episode),
    steps: 1,
    reward: 0,
  }),
}));
vi.mock('../persistence/checkpoints', () => ({
  saveQAgent: storage.saveQAgent,
  saveDqnMetadata: vi.fn(),
  dqnHandler: vi.fn(),
  loadMetadata: vi.fn(),
  loadQAgent: vi.fn(),
}));
vi.mock('../../../game/domain/environment', () => ({
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

it.each([
  { target: 600, firstWin: 700, end: 700, reason: 'episode-limit' },
  { target: 1000, firstWin: 100, end: 700, reason: 'no-improvement' },
] as const)(
  'finishes with a successful policy (target $target, first win $firstWin)',
  async ({ target, firstWin, end, reason }) => {
    vi.resetModules();
    storage.saveQAgent.mockClear();
    evaluation.succeeds = (episode) => episode >= firstWin && episode !== 600;
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
          episodes: target,
          speed: 'max',
          renderAgents: false,
        },
      } as MessageEvent<WorkerCommand>);
      await vi.waitFor(() => expect(events.some((event) => event.type === 'complete')).toBe(true));
      const evaluations = events.filter((event) => event.type === 'evaluation');
      expect(evaluations.map((event) => event.result.episode)).toEqual([
        100, 200, 300, 400, 500, 600, 700,
      ]);
      expect(events).toContainEqual({ type: 'complete', id: 'AI-1', reason });
      const [best, final] = storage.saveQAgent.mock.calls.slice(-2);
      expect(best[0]).toMatch(/AI-1\/best$/);
      expect(best[2]).toBe(firstWin);
      expect(best[3].kind).toBe('best');
      expect(final[0]).toMatch(/AI-1\/final$/);
      expect(final[2]).toBe(end);
      expect(final[3].evaluation.success).toBe(true);
      expect(final[3].stopReason).toBe(reason);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);
