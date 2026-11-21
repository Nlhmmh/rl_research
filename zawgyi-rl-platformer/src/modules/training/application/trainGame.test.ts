import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainingCallbacks } from '../../reinforcement-learning/infrastructure/workers/trainingManager';
import type { WorkerCommand } from '../../reinforcement-learning/infrastructure/workers/protocol';

const mocks = vi.hoisted(() => ({
  callbacks: null as TrainingCallbacks | null,
  send: vi.fn<(id: string, command: WorkerCommand) => void>(),
  saveManifest: vi.fn(),
}));
vi.mock('../../reinforcement-learning/infrastructure/persistence/checkpoints', () => ({
  saveManifest: mocks.saveManifest,
  loadManifest: vi.fn(),
}));
vi.mock('../../reinforcement-learning/infrastructure/workers/trainingManager', () => ({
  TrainingManager: class {
    constructor(callbacks: TrainingCallbacks) { mocks.callbacks = callbacks; }
    ids() { return ['AI-1', 'AI-2']; }
    broadcast = vi.fn();
    send = mocks.send;
    dispose = vi.fn();
    start = vi.fn();
  },
}));
import { createTrainGame } from './trainGame';

function setup() {
  const onMessage = vi.fn();
  const game = createTrainGame({
    onSnapshots: vi.fn(), onStatsReset: vi.fn(), onHistoryReset: vi.fn(),
    onStats: vi.fn(), onHistory: vi.fn(), onActive: vi.fn(), onMessage,
    onAlgorithm: vi.fn(), onAgentCount: vi.fn(), onSpeed: vi.fn(),
  });
  return { game, onMessage };
}

describe('training policy saving', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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

  it('automatically saves once all agents complete and confirms persistence', async () => {
    const { game, onMessage } = setup();
    game.start({ algorithm: 'q-learning', agentCount: 2, episodes: 10, speed: 'max' });
    mocks.callbacks!.onEvent!({ type: 'complete', id: 'AI-1' });
    expect(mocks.send).not.toHaveBeenCalled();
    mocks.callbacks!.onEvent!({ type: 'complete', id: 'AI-2' });
    expect(mocks.send).toHaveBeenCalledTimes(2);
    expect(mocks.saveManifest).not.toHaveBeenCalled();
    for (const [id, command] of mocks.send.mock.calls) {
      if (command.type === 'save') mocks.callbacks!.onEvent!({
        type: 'saved', id, checkpointId: command.checkpointId,
      });
    }
    await vi.waitFor(() => expect(onMessage).toHaveBeenLastCalledWith(
      'Training complete. All agent policies saved automatically.',
    ));
    mocks.callbacks!.onEvent!({ type: 'complete', id: 'AI-2' });
    expect(mocks.send).toHaveBeenCalledTimes(2);
    game.dispose();
  });
});
