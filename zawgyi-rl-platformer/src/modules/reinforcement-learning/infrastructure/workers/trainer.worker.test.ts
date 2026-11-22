import { expect, it, vi } from 'vitest';
import type { WorkerCommand, WorkerEvent } from './protocol';

const storage = vi.hoisted(() => ({ saveQAgent: vi.fn().mockResolvedValue(undefined) }));
const evaluation = vi.hoisted(
  (): { succeeds: (episode: number) => boolean; episodeLength: number } => ({
    succeeds: () => false,
    episodeLength: 1,
  }),
);
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
  saveDqnAgent: vi.fn(),
  dqnHandler: vi.fn(),
  loadMetadata: vi.fn(),
  loadQAgent: vi.fn(),
}));
vi.mock('../../../game/domain/environment', () => ({
  HimavantaEnvironment: class {
    reset() {
      return { x: 80, y: 420, vx: 0, vy: 0, grounded: true, steps: 0, done: false, success: false };
    }
    steps = 0;

    step() {
      const steps = ++this.steps;
      const done = steps === evaluation.episodeLength;
      if (done) this.steps = 0;
      return {
        state: { ...this.reset(), done, steps },
        reward: -40,
        done,
        success: false,
      };
    }
  },
}));

async function setupWorker() {
  vi.resetModules();
  storage.saveQAgent.mockClear();
  const events: WorkerEvent[] = [];
  const worker = {
    onmessage: null as ((event: MessageEvent<WorkerCommand>) => void) | null,
    postMessage: (event: WorkerEvent) => events.push(event),
  };
  vi.stubGlobal('self', worker);
  await import('./trainer.worker');
  function start(stepBudget: number) {
    worker.onmessage!(
      new MessageEvent<WorkerCommand>('message', {
        data: {
          type: 'start',
          id: 'AI-1',
          runId: 'run-test',
          algorithm: 'q-learning',
          stepBudget,
          speed: 'max',
          renderAgents: false,
        },
      }),
    );
  }
  return { start, events };
}

it.each([
  { budget: 650, firstWin: Infinity, end: 650, reason: 'step-budget' },
  { budget: 650, firstWin: 650, end: 650, reason: 'step-budget' },
  { budget: 1000, firstWin: 100, end: 600, reason: 'no-improvement' },
] as const)(
  'saves the right checkpoints at step $end when the first win is $firstWin',
  async ({ budget, firstWin, end, reason }) => {
    evaluation.episodeLength = 1;
    evaluation.succeeds = (episode) => episode >= firstWin && episode !== 600;
    const { start, events } = await setupWorker();
    try {
      start(budget);
      await vi.waitFor(() => expect(events.some((event) => event.type === 'complete')).toBe(true));
      const complete = events.find((event) => event.type === 'complete');
      const evaluations = events.filter((event) => event.type === 'evaluation');
      expect(evaluations.map((event) => event.result.episode)).toEqual(
        end === 600 ? [100, 200, 300, 400, 500, 600] : [100, 200, 300, 400, 500, 600, 650],
      );
      expect(complete).toMatchObject({ reason, runId: 'run-test', finalId: 'run-test/AI-1/final' });
      if (firstWin <= end) {
        expect(storage.saveQAgent.mock.calls[0]).toEqual([
          'run-test/AI-1/best',
          expect.anything(),
          firstWin,
          expect.objectContaining({ kind: 'best' }),
        ]);
        expect(complete?.bestId).toBe('run-test/AI-1/best');
      } else {
        expect(storage.saveQAgent).toHaveBeenCalledTimes(1);
        expect(complete?.bestId).toBeUndefined();
      }
      expect(storage.saveQAgent.mock.lastCall).toEqual([
        'run-test/AI-1/final',
        expect.anything(),
        end,
        expect.objectContaining({
          stopReason: reason,
          totalSteps: end,
          evaluation: expect.objectContaining({ success: firstWin === end }),
        }),
      ]);
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it('evaluates at a mid-episode cap and resumes that episode on extension', async () => {
  evaluation.episodeLength = 4;
  evaluation.succeeds = () => false;
  const { start, events } = await setupWorker();
  try {
    start(3);
    await vi.waitFor(() =>
      expect(events.filter((event) => event.type === 'complete')).toHaveLength(1),
    );
    expect(events.filter((event) => event.type === 'history')).toHaveLength(0);
    start(5);
    await vi.waitFor(() =>
      expect(events.filter((event) => event.type === 'complete')).toHaveLength(2),
    );
    expect(events.filter((event) => event.type === 'history')).toMatchObject([
      { point: { episode: 1, steps: 4 } },
    ]);
    expect(storage.saveQAgent.mock.lastCall).toEqual([
      'run-test/AI-1/final',
      expect.anything(),
      1,
      expect.objectContaining({ totalSteps: 5 }),
    ]);
  } finally {
    vi.unstubAllGlobals();
  }
});
