# Reinforcement Learning Research by Nathan

## Zawgyi: Quest for the Philosopher's Stone

A browser-based reinforcement learning platformer set in Himavanta Forest.
Play as the Burmese alchemist Zawgyi, watch a saved policy, or train independent
Q-learning and DQN agents on the same deterministic level.

### Run

```bash
cd zawgyi-rl-platformer
npm install
npm run dev
```

### Modes

- **Human Play:** keyboard movement, jumping, pause/resume, restart, and outcomes.
- **Watch AI:** random baseline or a specific saved run/agent; 1×/2×/4× playback.
  Success/failure stays visible until Restart.
- **Train AI:** 1/2/4/8 independent agents, worker-based Q-learning or DQN,
  live statistics, three charts, camera selection, and policy save/load.
  Optional headless training disables the canvas and worker snapshots.

The interface supports English and Burmese Unicode. The game uses supplied
character, forest, platform, stone, and emblem PNG assets.

### Documentation

- [Application setup, controls, architecture, and storage](zawgyi-rl-platformer/README.md)
- [Product requirements](zawgyi-rl-platformer/README-requirements.md)
- [How reinforcement learning works](zawgyi-rl-platformer/README-rl.md)

### Development

Run commands inside `zawgyi-rl-platformer`:

```bash
npm run format
npm run test:run
npm run lint
npm run typecheck
npm run build
```

Policies are stored in browser IndexedDB for the current site and browser profile.
They are policy checkpoints, not exact resumable training snapshots. Learning
performance depends on training settings; a fixed-level benchmark does not
establish generalization to unseen levels.
