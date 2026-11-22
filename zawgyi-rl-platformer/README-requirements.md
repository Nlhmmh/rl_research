# Game Requirements

This document defines the current product requirements. Requirements describe
intended behavior, not a claim that every item has been independently validated.
The implementation notes at the end distinguish current limits from targets.

## Zawgyi: Quest for the Philosopher's Stone

### 1. Game Overview

**Game Name:** Zawgyi: Quest for the Philosopher's Stone

**Game Type:** 2D Side-Scrolling Platformer

**Game Theme:** Burmese Mythology, Alchemy, Himalayan Jungle and Mountains

**Languages:** English and Burmese (မြန်မာ)

**Main Purpose:** Create a 2D platformer game where users can play manually, train an AI agent using Reinforcement Learning, and watch the AI learn and play the game.

### 2. Game Story

The main character is **Zawgyi (ဇော်ဂျီ)**, a mystical Burmese alchemist searching for the legendary **Philosopher's Stone (ဓာတ်လုံး)**.

Zawgyi travels through the mysterious Himalayan forests and mountains, overcoming dangerous terrain and obstacles to find the magical stone.

The game begins in the mystical **Himavanta Forest (ဟိမဝန္တာတော)**.

### 3. Main Character

The player controls Zawgyi, a traditional Burmese mystical alchemist.

**Appearance:**

- Traditional red clothing.
- Mystical alchemist appearance.
- Optional magical staff.
- Simple character animations.

**Abilities:**

- Move left.
- Move right.
- Jump.
- Land on platforms.
- Fall.
- Respawn after failure.

For the initial version, Zawgyi does not need fighting abilities, magic spells, or other advanced actions.

### 4. Game Environment

The game takes place in a 2D side-scrolling world inspired by Himalayan jungles and mountains.

**Initial level requirements:**

- One short, playable level.
- Forest and mountain background.
- Solid ground and platforms.
- Small gaps that require jumping.
- Starting position for Zawgyi.
- Philosopher's Stone at the end of the level.
- Camera follows the character as it moves.

The first level should be simple enough for both human players and AI agents to complete.

### 5. Game Objectives

**Main Objective:**

Reach the Philosopher's Stone at the end of the level.

**Success Conditions:**

- Zawgyi successfully reaches the stone.
- The game displays a success message.
- The level is marked as completed.

**Failure Conditions:**

- Zawgyi falls into a dangerous gap.
- The game displays a failure message or automatically restarts.

### 6. Game Modes

The game must support three modes.

#### 6.1 Human Play Mode

Users can play the game themselves.

**Requirements:**

- Control Zawgyi using a keyboard.
- Move left and right.
- Jump over gaps.
- Land on platforms.
- Reach the Philosopher's Stone.
- Pause and resume.
- Restart the level.

#### 6.2 Watch AI Mode

Users can watch an AI agent play the game automatically.

**Requirements:**

- The AI controls Zawgyi without human input.
- Users can see the AI moving and jumping.
- AI attempts to avoid gaps and obstacles.
- AI tries to reach the Philosopher's Stone.
- Stop at success or failure and keep the outcome visible until the user restarts.
- Pause and resume AI gameplay.
- Restart the current AI episode.
- Adjust gameplay speed (1×, 2×, 4×).
- Watch an untrained AI agent.
- Watch a trained AI agent.
- Select a specific saved run and agent, with algorithm, episode count, and save time shown.
- Open a successful Best checkpoint when available and provide a shortcut to
  reload the recommended policy.
- Mark incompatible checkpoints and prevent selecting them for playback.
- Clearly identify whether the AI is trained or untrained.

**Important:** The AI must make its own decisions based on reinforcement learning rather than following predefined movements or scripted paths.

#### 6.3 Train AI Mode

Users can train an AI agent to play the platformer.

**Requirements:**

- Start AI training.
- Pause and resume training.
- Stop training.
- Restart training from the beginning.
- Set a hard simulator-step budget per agent. Default to 1,000,000 steps.
- Let users add steps for agents that reach their budget without a successful
  evaluation and resume those agents from their in-memory state.
- Allow the AI to learn through repeated attempts.
- Reward successful behavior.
- Penalize unsuccessful behavior.
- Automatically restart training after each attempt.
- Display training progress.
- Save training progress.
- Continue training a previously trained agent.
- Watch the AI playing during training.
- Watch the trained AI after training.
- Choose Q-learning or DQN.
- Select 1, 2, 4, or 8 independent agents.
- Switch between rendered and headless training during a run.
- Keep statistics and charts active when rendering is disabled.

### 7. Reinforcement Learning Requirements

The AI must learn how to play through trial and error.

**AI Learning Behavior:**

- Initially, the AI does not know how to complete the level.
- The AI explores different movements and jumps.
- The AI receives rewards or penalties based on its actions.
- The AI gradually improves its decisions.
- The AI learns how to jump over gaps.
- The AI learns how to avoid falling.
- The AI learns how to reach the destination.

**Reward Examples:**

| AI Behavior                 | Reward                |
| --------------------------- | --------------------- |
| Reaches Philosopher's Stone | Large positive reward |
| Moves closer to the goal    | Small positive reward |
| Successfully crosses a gap  | Positive reward       |
| Falls into a gap            | Large negative reward |
| Takes unnecessary actions   | Small negative reward |

Current reward settings are centralized in `src/game/level.ts`:

| Event | Reward |
| ----- | ------ |
| Each environment step | −0.01 |
| Signed horizontal progress | +0.05 × change in X |
| New forward walking progress on solid ground | +0.02 × newly reached distance |
| Actual jump takeoff | −0.5, once per takeoff |
| Safely pass each gap | +4, once per gap per episode |
| Reach the goal | +100 |
| Fall or timeout | −40 |

Walking bonuses must not be farmable by repeating already-covered ground.
Necessary jumps remain available. Walking and jumping use the same horizontal
speed; rewards encourage efficient completion and discourage unnecessary jumps,
but do not guarantee that the learned policy is optimal.

The AI should learn to complete the level successfully and efficiently, rather than simply memorize predefined movements.

### 8. AI Gameplay Visualization

Users must be able to watch how the AI behaves.

**During AI Gameplay:**

- Display the AI-controlled Zawgyi.
- Show running and jumping movements.
- Show mistakes and failures.
- Show successful attempts.
- Display the current AI action.
- Display the AI's progress toward the goal.

**During AI Training:**

- Allow users to observe learning attempts.
- Show how AI performance changes over time.
- Show both failed and successful episodes.
- Allow users to switch between watching gameplay and viewing training results.

The AI gameplay must be visually understandable and entertaining to watch.

### 9. AI Training Dashboard

Provide a dashboard for monitoring training.

**Training Controls:**

- Start Training
- Pause Training
- Resume Training
- Stop Training
- Reset Training
- Save AI
- Load AI
- Watch AI

**Training Information:**

- Current episode, steps used, and step budget per agent.
- Latest and best greedy outcomes and steps to goal.
- Furthest position in the latest greedy evaluation.
- Current AI status, including solved and budget reached.

**Training Charts:**

- Rewards over time.
- Average rewards.
- Exploratory training success rate over time.

All displayed information must reflect actual AI training results.

### 10. Language Requirements

Support two languages:

- English
- Burmese (မြန်မာ)

Users must be able to switch languages.

Translate:

- Main menu.
- Game buttons.
- Game instructions.
- Success and failure messages.
- AI training controls.
- AI training information.
- Gameplay status.
- Settings.

Burmese text must display correctly and be easy to read.

### 11. Game Interface

#### Main Menu

Include:

- Play Game
- Watch AI
- Train AI
- Language Selection

#### Gameplay Screen

Include:

- Main game area.
- Current game mode.
- Level progress.
- Pause / Resume.
- Restart.
- Return to main menu.

#### AI Gameplay Screen

Include:

- Main game area with AI-controlled character.
- Current episode.
- Current reward.
- AI status.
- AI action.
- Success / Failure information.
- Game speed controls.
- Pause / Resume.

#### Training Screen

Include:

- AI training controls.
- Live AI gameplay viewing area.
- Optional headless mode that removes the Phaser canvas and suppresses worker snapshots.
- Training statistics.
- Training charts.
- Desktop layout with controls, game, and statistics on the left and charts on
  the right; stack the columns on smaller screens.
- Watch Trained AI option.

### 12. Visual and Art Requirements

**Art Style:**

- 2D pixel art or simple illustrated graphics.
- Traditional Burmese mythology inspiration.
- Mystical forest atmosphere.
- Himalayan mountains.
- Natural forest colors.
- Magical lighting effects.

**Main Character:**

- Recognizable Burmese Zawgyi appearance.
- Traditional red clothing.
- Basic movement animations.

**Environment:**

- Forest background.
- Mountains.
- Ground and platforms.
- Dangerous gaps.
- Magical stone at the destination.

The initial version should prioritize clarity and playable gameplay over complex graphics.

### 13. Initial Version Scope (MVP)

The first version must include:

- One playable level.
- One Zawgyi character.
- Basic left/right movement.
- Jumping and gravity.
- Platforms and gaps.
- Philosopher's Stone as the goal.
- Human Play Mode.
- Watch AI Mode.
- Train AI Mode.
- Basic reinforcement learning.
- Visible AI gameplay.
- Automatic episode restart during training; explicit restart after Watch AI outcomes.
- Basic training statistics.
- Save and load trained AI.
- English and Burmese language switching.
- Simple menus and controls.

**Not required for the initial version:**

- Enemies.
- Combat.
- Magic spells.
- Inventory.
- Multiple levels.
- Multiplayer.
- Character customization.
- Complex storytelling.
- Advanced graphics.
- Online accounts.
- Leaderboards.

### 14. Future Improvements

After the initial version is working, the game may introduce:

- Multiple Himalayan jungle and mountain levels.
- Moving platforms.
- Different obstacles and traps.
- Enemies and creatures inspired by Burmese mythology.
- Magic abilities.
- Collectible items.
- Randomly generated levels.
- Additional multi-agent experiments beyond the independent 1/2/4/8-agent setup.
- Side-by-side AI gameplay comparison.
- Algorithms beyond Q-learning and DQN.
- AI competitions.
- More advanced training visualizations.
- Increasing level difficulty.

### 15. Success Criteria

The initial project is considered successful when:

1. A human can play and complete the level.
2. An AI agent can control Zawgyi independently.
3. Users can watch the AI playing in real time.
4. Users can start and monitor AI training.
5. The AI learns through rewards and penalties.
6. A trained AI demonstrates improved performance compared with an untrained AI.
7. Users can watch the trained AI attempt to complete the level.
8. AI gameplay and training results are visible and understandable.
9. Users can switch between English and Burmese.
10. The game is simple, playable, and ready for future expansion.

## 16. Multiple AI Agents — Train AI Mode

### 16.1 Overview

**Multiple AI Agents** must be an optional feature integrated directly into **Train AI Mode**, not a separate game mode.

Users can choose to train a single AI agent or multiple AI agents simultaneously.

When rendering is enabled, all selected agents must be visible playing and
learning together in the same 2D side-scrolling scene. Headless training is an
option inside Train AI Mode, not a fourth mode.

### 16.2 Agent Selection

Before starting training, users can select the number of AI agents.

**Available options:**

- 1 Agent (default)
- 2 Agents
- 4 Agents
- 8 Agents

The selected number of agents will be created when training starts.

### 16.3 Simultaneous Training

When multiple agents are selected:

- All agents start training simultaneously.
- Each agent controls its own Zawgyi character.
- Each agent makes independent decisions.
- Each agent learns independently through reinforcement learning.
- Each agent receives its own rewards and penalties.
- Each agent has its own training episodes and progress.
- All agents use the same level, obstacles, and game rules.
- Agents do not collide with or interfere with one another.
- When an agent fails or completes the level, only that agent restarts.
- Other agents continue training without interruption.
- Agents may discover different strategies and improve at different rates.

### 16.4 Live Training Visualization

Users must be able to watch all agents training together in **one shared game scene**.

Requirements:

- Display all active agents simultaneously when visualization is enabled.
- Give each agent a unique identifier (AI-1, AI-2, etc.).
- Use different colors or visual indicators to distinguish agents.
- Show their movements, jumps, successes, and failures.
- Show agents restarting independently.
- Allow selecting an agent to view its details.
- Allow the camera to follow a selected agent.
- Provide an overview camera to view the entire level.
- Keep the game visually clear when agents overlap.
- Allow visualization to be disabled without interrupting learning or charts.
- Do not imply that rendering off removes simulation work or DQN optimizer cost.

### 16.5 Training Controls

Provide controls within Train AI Mode.

**Training controls:**

- Number of Agents: 1 / 2 / 4 / 8
- Start Training
- Pause Training
- Resume Training
- Stop Training
- Reset Training
- Training Speed: 1× / 2× / 4× / Maximum
- Save Trained Agents
- Watch Trained AI

Training speed controls must affect the simulation speed while keeping the interface responsive.

### 16.6 Training Dashboard

When multiple agents are training, show individual performance statistics.

| Agent | Episode | Latest greedy | Best greedy | Status |
| --- | --- | --- | --- | --- |
| AI-1 | 600 | Missed goal | Goal in 491 steps | Solved |
| AI-2 | 600 | Missed goal | — | Training |

_Illustrative values only._

The dashboard must display actual training results and update during training.

Show exploratory rewards and success rates in the charts. Show greedy evaluation
results separately in the agent table.

### 16.7 Single-Agent Training

When **1 Agent** is selected:

- The game behaves like the original single-agent Train AI Mode.
- Only one Zawgyi character appears.
- Training controls and statistics work normally.
- No unnecessary multi-agent interface elements are displayed.

### 16.8 Watch AI Mode Integration

**Watch AI Mode remains a separate existing mode**, but it is not necessary to create a new Multiple AI Mode.

After training, users can:

- Select a saved trained agent.
- Watch the selected agent play.
- Compare trained and untrained behavior.
- Optionally watch multiple previously trained agents together in the same scene.

### 16.9 Updated Train AI Mode Interface

```text
TRAIN AI MODE
────────────────────────────────────────

Training Settings

Number of AI Agents:
(●) 1    ( ) 2    ( ) 4    ( ) 8

Training Steps per Agent: 1,000,000
Training Speed: 1× / 2× / 4× / Max

[ Start Training ]  [ Pause ]  [ Stop ]

────────────────────────────────────────

           LIVE GAME SCENE

        AI-1       AI-2
          🧙        🧙

      AI-3                AI-4
       🧙                  🧙

  ━━━━━━━    ━━━━━━━    ━━━━━━━━━━
           Gaps and Platforms

────────────────────────────────────────

AGENT PERFORMANCE

Agent    Episode   Steps Used   Latest Greedy   Best Greedy
AI-1      600       300,000      Missed goal     Goal in 491 steps
AI-2      600       300,000      Missed goal     —

────────────────────────────────────────

[ Training Charts ]

[ Save Agents ]  [ Watch Trained AI ]
```

### 16.10 MVP Acceptance Criteria

1. Train AI Mode provides a choice of 1, 2, 4, or 8 agents.
2. Single-agent training remains the default.
3. Multiple agents can train simultaneously.
4. All agents appear in the same game scene when visualization is enabled.
5. Each agent learns and makes decisions independently.
6. Each agent maintains independent episodes, rewards, and statistics.
7. Individual agent failures do not interrupt other agents.
8. Training progress is visible in real time.
9. Users can compare agent performance.
10. Users can save trained agents and watch their learned gameplay.
11. Training reports whether each agent solved the level or exhausted its step
    budget. Extending the budget continues only the unsolved agents.

### Final Requirement

**Train AI Mode must support optional multi-agent training within one shared game scene.**
Users choose how many agents to train. Each learns independently; gameplay is
displayed together when rendering is enabled, and metrics remain visible in headless mode.

The game must retain its three original modes:

1. **Human Play Mode** — Play the platformer manually.
2. **Watch AI Mode** — Watch trained or untrained AI gameplay.
3. **Train AI Mode** — Train one or multiple AI agents with live visualization and performance monitoring.

---

### Final Project Goal

**Develop a Burmese mythology-inspired 2D platformer where a Zawgyi alchemist searches for the Philosopher's Stone, while users can play manually, train an AI agent through reinforcement learning, and visually observe how the AI learns to overcome obstacles and complete the game.**

The main focus is not creating a complex platformer. It is creating an engaging and interactive environment for **learning, experimenting with, and visualizing Reinforcement Learning**.

### Evaluation and persistence

- Evaluate with exploration and learning disabled every 100 completed episodes
  and at the step budget. Use a fresh episode from the normal spawn.
- Save the first successful policy as Best. Replace it only with a faster
  successful policy. Stop early after five consecutive evaluations without
  improvement once Best exists. Report budget exhaustion when no evaluation
  reached the goal.
- Save Final on automatic completion, even if the last evaluation failed.
  Keep Final and Best under the same run ID. Publish the latest-run manifest
  only after all agents save their checkpoints.
- Store policies and compatibility metadata in server-side SQLite. Scope access
  to the browser session identified by a cookie.
- Pause on manual Save and wait for any in-flight DQN update before serialization.
- Watch AI lists saved policies across runs and disables incompatible entries.
  Train AI loads the latest
  saved run as a starting point with fresh DQN replay and optimizer state.
- Validate the level, observation, and reward versions before loading. Current
  observation and reward versions are `v2`.

### Implementation boundaries

- Q-learning uses finer distance bins near gaps and reuses states for equivalent
  gap approaches.
- Keep canonical physics and reward logic in pure TypeScript. Phaser renders
  snapshots; it must not define a different collision model.
- Screen components own React state and layout. Controllers coordinate
  gameplay and training. Workers and learners live under
  `src/modules/reinforcement-learning/`.
- English/Burmese coverage remains a product requirement. Some diagnostic strings,
  chart headings, and statistics labels are currently English-only.
- Existing sprite poses are selected from action and time; physically accurate
  grounded/jump/fall animation selection remains a refinement.
