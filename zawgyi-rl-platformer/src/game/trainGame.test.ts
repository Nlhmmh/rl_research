import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TrainingCallbacks } from '../rl/trainingManager';
import type { WorkerCommand } from '../rl/protocol';

const mocks = vi.hoisted(() => ({
  callbacks: null as TrainingCallbacks | null,
  send: vi.fn<(id: string, command: WorkerCommand) => void>(),
  saveManifest: vi.fn(),
}));
vi.mock('../persistence/checkpoints', () => ({
  saveManifest: mocks.saveManifest,
  loadManifest: vi.fn(),
}));
vi.mock('../rl/trainingManager', () => ({
  TrainingManager: class {
    constructor(callbacks: TrainingCallbacks) { mocks.callbacks = callbacks; }
    ids() { return ['AI-1', 'AI-2']; }
    broadcast = vi.fn();
    send = mocks.send;
    dispose = vi.fn();
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
});
