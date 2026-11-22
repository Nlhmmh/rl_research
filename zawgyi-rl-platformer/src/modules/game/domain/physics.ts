import { FALL_MARGIN, FIXED_DT, GRAVITY, JUMP_SPEED, LEVEL, RUN_SPEED } from './level';
import { horizontalDirection, isJumpAction, type Action, type PlayerState } from './types';

function isOnGroundAt(x: number): boolean {
  // Center-point collision is intentionally simple for this first level.
  return LEVEL.ground.some((segment) => x >= segment.start && x <= segment.end);
}

export function initialPlayerState(): PlayerState {
  return {
    x: LEVEL.spawnX,
    y: LEVEL.groundY,
    vx: 0,
    vy: 0,
    grounded: true,
    steps: 0,
    done: false,
    success: false,
  };
}

export function physicsStep(
  state: PlayerState,
  action: Action,
  maxSteps: number | null = LEVEL.maxSteps,
): PlayerState {
  if (state.done) return { ...state };

  const vx = horizontalDirection(action) * RUN_SPEED;
  let vy = state.vy + GRAVITY * FIXED_DT;

  // Jump only when grounded.
  if (isJumpAction(action) && state.grounded) vy = -JUMP_SPEED;

  const x = Math.max(0, Math.min(LEVEL.width, state.x + vx * FIXED_DT)); // Clamp to level bounds.
  let y = state.y + vy * FIXED_DT;
  let grounded = false;

  // Land only when crossing the ground surface while moving downwards.
  if (vy >= 0 && state.y <= LEVEL.groundY && y >= LEVEL.groundY && isOnGroundAt(x)) {
    y = LEVEL.groundY;
    vy = 0;
    grounded = true;
  }

  const steps = state.steps + 1;
  const success = grounded && x >= LEVEL.goalX;

  // The player fails if they fall below the level or exceed the maximum number of steps.
  const failed = y > LEVEL.height + FALL_MARGIN || (maxSteps !== null && steps >= maxSteps);

  return {
    x,
    y,
    vx,
    vy,
    grounded,
    steps,
    done: success || failed,
    success,
  };
}
