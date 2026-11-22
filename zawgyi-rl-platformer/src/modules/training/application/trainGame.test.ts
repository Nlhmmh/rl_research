import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainingCallbacks } from '../../reinforcement-learning/infrastructure/workers/trainingManager';
import type {
  TrainingRunOptions,
  WorkerCommand,
} from '../../reinforcement-learning/infrastructure/workers/protocol';

const mocks = vi.hoisted(() => ({
  callbacks: null as TrainingCallbacks | null,
  send: vi.fn<(id: string, command: WorkerCommand) => void>(),
  saveManifest: vi.fn(),
  start: vi.fn<(count: number, options: TrainingRunOptions) => void>(),
}));
vi.mock('../../reinforcement-learning/infrastructure/persistence/checkpoints', () => ({
  saveManifest: mocks.saveManifest,
  loadManifest: vi.fn(),
}));
vi.mock('../../reinforcement-learning/infrastructure/workers/trainingManager', () => ({
  TrainingManager: class {
    constructor(callbacks: TrainingCallbacks) {
      mocks.callbacks = callbacks;
    }
    ids() {
      return ['AI-1', 'AI-2'];
    }
    broadcast = vi.fn();
    send = mocks.send;
    dispose = vi.fn();
    start = mocks.start;
  },
}));
import { createTrainGame } from './trainGame';

function setup() {
  const onMessage = vi.fn();
  const game = createTrainGame({
    onSnapshots: vi.fn(),
    onStatsReset: vi.fn(),
    onHistoryReset: vi.fn(),
    onStats: vi.fn(),
    onHistory: vi.fn(),
    onActive: vi.fn(),
    onExtendAvailable: vi.fn(),
    onMessage,
    onAlgorithm: vi.fn(),
    onAgentCount: vi.fn(),
    onSpeed: vi.fn(),
  });
  return { game, onMessage };
}

describe('training policy saving', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes the manifest only after every worker acknowledges storage', async () => {
    const { game, onMessage } = setup();
    const saving = game.save('q-learning');
    expect(mocks.saveManifest).not.toHaveBeenCalled();
    for (const [index, [id, command]] of mocks.send.mock.calls.entries()) {
      if (command.type !== 'save') throw new Error('Expected save command');
      mocks.callbacks!.onEvent!({ type: 'saved', id, checkpointId: command.checkpointId });
      if (index === 0) expect(mocks.saveManifest).not.toHaveBeenCalled();
    }
    await saving;
    expect(mocks.saveManifest).toHaveBeenCalledOnce();
    expect(onMessage).toHaveBeenLastCalledWith('All agent policies saved. Training is paused.');
    game.dispose();
  });

  it('preserves the previous manifest when a worker fails', async () => {
    const { game, onMessage } = setup();
    const saving = game.save('dqn');
    mocks.callbacks!.onEvent!({ type: 'error', id: 'AI-1', message: 'Storage quota exceeded' });
    await saving;
    expect(mocks.saveManifest).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenLastCalledWith('Storage quota exceeded');
    game.dispose();
  });

  it('references saved checkpoints once and extends only agents without a solution', async () => {
    const { game, onMessage } = setup();
    game.start({ algorithm: 'q-learning', agentCount: 2, stepBudget: 10, speed: 'max' });
    const { runId } = mocks.start.mock.calls[0][1];
    const solved = {
      type: 'complete',
      id: 'AI-1',
      runId,
      reason: 'no-improvement',
      finalId: `${runId}/AI-1/final`,
      bestId: `${runId}/AI-1/best`,
    } as const;
    const unsolved = {
      type: 'complete',
      id: 'AI-2',
      runId,
      reason: 'step-budget',
      finalId: `${runId}/AI-2/final`,
    } as const;
    mocks.callbacks!.onEvent!(solved);
    expect(mocks.saveManifest).not.toHaveBeenCalled();
    mocks.callbacks!.onEvent!(unsolved);
    await vi.waitFor(() =>
      expect(onMessage).toHaveBeenLastCalledWith(
        'Budget reached · goal not reached by 1 of 2 agents. Policies saved.',
      ),
    );
    expect(mocks.saveManifest).toHaveBeenCalledWith(
      expect.objectContaining({
        runId,
        checkpoints: {
          'AI-1': { finalId: solved.finalId, bestId: solved.bestId },
          'AI-2': { finalId: unsolved.finalId },
        },
      }),
    );
    mocks.callbacks!.onEvent!(unsolved);
    expect(mocks.saveManifest).toHaveBeenCalledOnce();
    expect(mocks.send).not.toHaveBeenCalled();
    game.extend(20);
    expect(mocks.send).toHaveBeenCalledExactlyOnceWith(
      'AI-2',
      expect.objectContaining({ type: 'start', runId, stepBudget: 30 }),
    );
    const improved = { ...unsolved, bestId: `${runId}/AI-2/best` };
    mocks.callbacks!.onEvent!(improved);
    await vi.waitFor(() =>
      expect(onMessage).toHaveBeenLastCalledWith(
        'Solved. All agents reached the goal. Best and final policies saved.',
      ),
    );
    game.dispose();
  });
});
