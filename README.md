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
- **Watch AI:** opens a successful Best policy when available. You can select
  another saved policy or the random baseline. Success or failure stays visible
  until Restart.
- **Train AI:** train 1, 2, 4, or 8 independent Q-learning or DQN agents with an
  adjustable step budget. Each agent evaluates every 100 episodes and at the
  budget limit. Headless mode keeps statistics and charts visible.

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

Training saves Final and, once an agent reaches the goal in a greedy evaluation,
Best. The app serves these policies from SQLite using a browser session cookie.
See the [application README](zawgyi-rl-platformer/README.md#saved-policies) for storage details.
