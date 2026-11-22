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

Watch AI opens a successful **Best** policy when available. It prefers the
fastest successful Best in the latest saved run, then looks for a successful
checkpoint across saved runs. Use the dropdown to select a saved policy,
including Python-trained policies on localhost, or choose the random baseline.
The picker shows available evaluation outcomes and disables incompatible policies.

Playback supports 1×/2×/4×, pause/resume, and restart. Learned policies use
exploration off and receive no learning updates. The episode stops on completion;
a green success or red failure message remains visible until Restart.

### Train AI

- Choose Q-learning or DQN and **1, 2, 4, or 8 agents**.
- Set the training budget in simulator steps. The default is **1,000,000 steps
  per agent**. Each AI episode still has its own **1,200-step** limit.
- Start, pause, resume, stop, reset, save, and load policies.
- Speeds: **1× / 2× / 4× / Max**.
- Render all agents in one shared scene with overview or selected-agent camera.
- Choose **Headless training** to remove the Phaser canvas and disable worker
  snapshots while training, statistics, and charts continue. Use **Max** to
  remove the visible-speed delay.
- View each agent's step usage, latest greedy result, best greedy result, and
  furthest position in the latest evaluation. Charts show exploratory training
  rewards and success rates, with rolling metrics over up to 100 episodes.
- Desktop charts are on the right; narrow screens stack the layout.

Each worker owns a separate environment and policy. Agents do not share Q-tables,
DQN weights, replay buffers, or episode state, and do not collide. More agents
do not combine their learning or guarantee faster training.

Every **100 completed episodes** and at the step budget, each worker runs a
fresh evaluation with exploration and learning off. The first success becomes
**Best**. A later success replaces it only if it finishes in fewer steps. The
worker stops at the budget or after **five evaluations without improvement**
following its first success, then saves **Final**.

If any agents finish without reaching the goal, **Extend step budget** adds the
entered number of steps for those agents and continues their in-memory training.
**Save** pauses training and writes policy checkpoints. **Load** loads policy
weights from the latest saved run. Use Save to keep the current policy before
stopping or leaving an active run.

## Offline DQN training

From `zawgyi-rl-platformer`, install the app dependencies with `npm install` and
run the commands below. The trainer uses Python 3 with NumPy and Node with native
TypeScript support and `module.registerHooks`. It was tested with Node 26.4.

```bash
python3 -m pip install -r tools/offline-dqn/requirements.txt
python3 tools/offline-dqn/train.py --steps 1000000 --seed 11
```

The Python trainer runs one DQN agent and uses the game's TypeScript simulator.
It writes **Best** on each faster successful evaluation and **Final** when
training ends. The terminal prints evaluations, throughput, and the checkpoint
IDs. Use a different `--seed` for an independent run.

Open the game on **localhost**. In **Watch AI**, select the checkpoint from the
dropdown and click **Load selected policy**. The list refreshes about every five
seconds while the screen is visible. The trainer uses `.data/policies.sqlite`
by default. Use `--database PATH` for a separate experiment database.

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
experience replay, and a target network. In the browser, CPU workers train off
the React thread. The offline trainer uses NumPy for the same DQN architecture.

A seeded regression benchmark compares both state encodings using 5,000 training
episodes per seed and exploration-free evaluation on the fixed level. Such tests
do not establish performance on unseen levels or guarantee every training run
will succeed.

## Architecture

```text
public/assets/                       Game art and branding
server/                              SQLite policy API
tools/offline-dqn/                    Python DQN trainer and simulator bridge
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
      infrastructure/                Q-learning, DQN, workers, policy storage
    training/application/            Run controls and coordinated checkpoint saves
  shared/i18n/                       Translations and language switcher
```

All modes use the same deterministic TypeScript simulator at 1/60-second steps.
Phaser draws snapshots rather than owning gameplay physics. Controllers report
changes through callbacks and are disposed when their screens unmount.

## Saved policies

The Vite dev and preview servers and the Python trainer use
**`.data/policies.sqlite`** under the application directory. A session cookie
identifies browser-trained policies. Offline policies are shared across local
Watch AI sessions and are served only over loopback. Clearing a session cookie
loses access to its browser-trained records. The rows remain in SQLite.

| Record key | Contents |
| --- | --- |
| `zawgyi/checkpoint/<runId>/<agentId>/best` | Fastest successful greedy policy |
| `zawgyi/checkpoint/<runId>/<agentId>/final` | Policy and evaluation when training ends automatically |
| `zawgyi/checkpoint/<runId>/<agentId>/manual` | Policy saved with the Save button |
| `zawgyi/latest-manifest` | Latest browser-saved run and references to its agent checkpoints |

One run ID groups all agents. For browser training, the completion manifest
references the worker checkpoints after all agents save successfully. Q-learning
saves its Q-table. DQN stores the model and metadata together. Older compatible policies remain
selectable in Watch AI. Current observation and reward versions are both `v2`.

Extending an open browser run preserves its in-memory training state. In
Train AI, loading the latest browser run starts a new run from saved weights
with fresh DQN replay and optimizer state. On startup, the app imports legacy
IndexedDB policies into SQLite once per browser session.

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
