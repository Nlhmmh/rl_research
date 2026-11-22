import { LEVEL, REWARDS } from './level';
import { initialPlayerState, physicsStep } from './physics';
import type { Action, PlayerState, Transition } from './types';

export class HimavantaEnvironment {
  private state: PlayerState = initialPlayerState();
  private crossedGaps = new Set<number>();
  private furthestX: number = LEVEL.spawnX;

  private readonly maxSteps: number | null;

  constructor({ maxSteps = LEVEL.maxSteps }: { maxSteps?: number | null } = {}) {
    this.maxSteps = maxSteps;
  }

  reset(): PlayerState {
    this.state = initialPlayerState();
    this.crossedGaps.clear();
    this.furthestX = LEVEL.spawnX;
    return this.getState();
  }

  getState(): PlayerState {
    return { ...this.state }; // prevent external mutation
  }

  step(action: Action): Transition {
    if (this.state.done) {
      return {
        state: this.getState(),
        reward: 0,
        done: true,
        success: this.state.success,
      };
    }

    const before = this.state;
    const after = physicsStep(before, action, this.maxSteps);
    let reward = REWARDS.step as number; // time cost; discourages endless waiting

    // Reward NET movement toward the goal; moving back cancels progress.
    reward += REWARDS.progress * (after.x - before.x);

    // Reward new forward ground progress only, preventing back-and-forth farming.
    if (before.grounded && after.grounded) {
      reward += REWARDS.walkingProgress * Math.max(0, after.x - this.furthestX);
    }
    this.furthestX = Math.max(this.furthestX, after.x);
    // Charge once per actual takeoff, not for jump inputs while already airborne.
    if (before.grounded && after.vy < 0) reward += REWARDS.jumpTakeoff;

    // Reward a gap only once, after safely reaching its far side.
    // The +8 offset is to avoid rewarding the player for just barely touching the landing platform.
    // The gap index starts at 1 because the first ground segment is the starting platform.
    for (let i = 1; i < LEVEL.ground.length; i++) {
      const landingX = LEVEL.ground[i].start;
      if (!this.crossedGaps.has(i) && after.grounded && after.x >= landingX + REWARDS.safeLandingOffset) {
        this.crossedGaps.add(i);
        reward += REWARDS.gap;
      }
    }

    if (after.done) reward += after.success ? REWARDS.success : REWARDS.failure;

    this.state = after;
    return {
      state: this.getState(),
      reward,
      done: after.done,
      success: after.success,
    };
  }
}
