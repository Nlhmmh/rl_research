# Zawgyi RL Platformer

An educational 2D platformer built with React, TypeScript, Phaser, TensorFlow.js,
Web Workers, Recharts, and i18next. Zawgyi crosses three gaps in Himavanta Forest
to reach the Philosopher's Stone.

## Setup

Use Node.js 22.12+ as the guide baseline, or a newer version supported by the
installed Vite toolchain.

```bash
npm install
npm run dev
```

Open the address printed by Vite.

## Modes and controls

### Human Play

- Move: **A / D** or **Left / Right**.
- Jump: **W**, **Up**, or **Space**; combine with movement to jump sideways.
- Pause/resume: **P / Esc** or the on-screen button.
- Restart: **R** or the on-screen button.
- **S** has no assigned action.
- Pausing freezes simulation and character pose animation. Success/failure is
  displayed on the screen.

Keyboard mappings are defined in `src/features/human-play/keyboard-controller.ts`.

### Watch AI

Choose a random untrained baseline, load the latest policy, or select a specific
saved run and agent. Policy options show algorithm, episode count, and save time.
Incompatible versions are disabled.

Playback supports 1×/2×/4×, pause/resume, and restart. Learned policies use
exploration off and receive no learning updates. The episode stops on completion;
a green success or red failure message remains visible until Restart.

### Train AI

- Choose Q-learning or DQN and **1, 2, 4, or 8 agents**.
- Default episode target: **5,000 per agent**.
- Start, pause, resume, stop, reset, save, and load policies.
- Speeds: **1× / 2× / 4× / Max**.
- Render all agents in one shared scene with overview or selected-agent camera.
- Choose **Headless training** to remove the Phaser canvas and disable worker
  snapshots while training, statistics, and charts continue. Use **Max** to
  remove the visible-speed delay.
- View per-agent episode reward, rolling reward average and success percentage,
  exploration, status, and reward/average/success charts. Rolling metrics use
  up to 100 completed episodes; chart data is sampled.
- Desktop charts are on the right; narrow screens stack the layout.

Each worker owns a separate environment and policy. Agents do not share Q-tables,
DQN weights, replay buffers, or episode state, and do not collide. More agents
do not combine their learning or guarantee faster training.

**Stop discards unsaved in-memory policies. Save before stopping or leaving the
screen.** Save pauses training. Train AI's Load action restores the latest run;
Watch AI additionally supports selecting individual policies from older runs.

## Learning configuration

`src/modules/game/domain/level.ts` centralizes geometry, physics constants, rewards, observation settings,
Q-learning defaults, sprite dimensions, and game timing.

Q-learning uses a tabular Bellman update with alpha 0.1, gamma 0.95, epsilon
starting at 1, minimum 0.05, and decay 0.997 per episode. Gap-distance bins are
10px near edges and coarser farther away. Equivalent approaches share states
across map positions.

Rewards encourage signed progress, new forward walking distance, safe gap
crossings, and goal completion. Actual jump takeoffs incur a small penalty.
Walking bonuses cannot be repeatedly collected over the same ground.

DQN uses an 8-feature observation, two 64-unit hidden layers, six action outputs,
experience replay, and a target network. CPU workers perform training off the
React thread.

A seeded regression benchmark compares both state encodings using 5,000 training
episodes per seed and exploration-free evaluation on the fixed level. Such tests
do not establish performance on unseen levels or guarantee every training run
will succeed.

## Architecture

```text
public/assets/                       Game art and branding
src/
  main.tsx                           React entry point
  app/                               App shell, navigation, global styles
  features/                          Main Menu, Human Play, Watch AI, Train AI
  modules/
    game/
      domain/                        Level, physics, rewards, episode termination
      application/                   Rendering snapshots
      infrastructure/phaser/         World scene, sprites, camera
      presentation/                  React canvas and resize handling
    reinforcement-learning/
      domain/policies/               Observation encoding
      application/                   Policy evaluation
      infrastructure/                Q-learning, DQN, workers, IndexedDB
    training/application/            Run controls and coordinated checkpoint saves
  shared/i18n/                       Translations and language switcher
```

All modes use the same deterministic TypeScript simulator at 1/60-second steps.
Phaser draws snapshots rather than owning gameplay physics. Controllers report
changes through callbacks and are disposed when their screens unmount.

## Saved policies

Policies live in **browser IndexedDB**, using `idb-keyval`'s default
`keyval-store` database and `keyval` object store:

| Key | Contents |
| --- | --- |
| `zawgyi/checkpoint/<runId>/<agentId>` | Metadata and Q-table, or DQN metadata |
| `zawgyi/checkpoint/<runId>/<agentId>/{best,final}` | Per-agent evaluation checkpoints |
| `<checkpoint key>/model` | DQN model topology and weights |
| `zawgyi/latest-manifest` | Most recently acknowledged saved agent group |

Every 100 training episodes, each agent evaluates its policy with exploration
and learning disabled. Reaching the goal ranks first, then fewer completion
steps. An agent stops after five evaluations without improvement or at its
episode limit and retains separate Best and Final checkpoints.

Group saves, including the completion autosave, wait for all agents to
acknowledge storage before updating the latest
manifest. Failures leave the previous manifest available. DQN serialization waits
for an active training batch to finish.

Watch AI discovers checkpoints across stored runs. Level, observation, and reward
compatibility is validated before loading. Current observation and reward versions
are both `v2`; older checkpoints may require fresh training.

These are **policy-only checkpoints**. Continuing DQN training starts from saved
online weights with fresh replay/optimizer state; exact interrupted training
continuation is not supported. Storage persists across refreshes but is specific
to the browser profile and origin, including the port. Clearing site data removes
it. File backup/export is not currently implemented.

Inspect storage in Chrome under **DevTools → Application → IndexedDB**.

## Assets and localization

Game art and branding live under `public/assets/`.

- `characters/zawgyi/spritesheet.png` holds eight character poses.
- `backgrounds/himavanta-forest.png` is the scene background.
- `terrain/grass-platform.png` is scaled proportionally across ground segments.
- `objects/philosopher-stone.png` is the nine-frame goal sprite sheet.
- `branding/alchemist-emblem.png` supplies the menu emblem and favicon.

English/Burmese selection persists in localStorage. Some statistics labels,
diagnostic messages, and chart headings remain English-only. Myanmar font
availability depends on the configured system fallbacks; a bundled font is not
provided. Character pose selection currently follows actions and animation timing,
rather than a complete grounded/jump/fall animation model.

## Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite development server |
| `npm run format` | Format with Prettier and existing ignore rules |
| `npm run test` | Run Vitest interactively |
| `npm run test:run` | Run tests once, including the slower learning benchmark |
| `npm run typecheck` | Check TypeScript |
| `npm run lint` | Run ESLint |
| `npm run build` | Typecheck and produce `dist/` |
| `npm run preview` | Serve the production build locally |

Phaser and TensorFlow.js produce large bundle warnings. Headless rendering
reduces display overhead, but DQN optimization still consumes CPU and memory.

## Project documents

- [Product requirements](README-requirements.md)
- [How reinforcement learning works](README-rl.md)
