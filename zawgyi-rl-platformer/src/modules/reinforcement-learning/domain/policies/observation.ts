import { LEVEL, OBSERVATION, RUN_SPEED } from '../../../game/domain/level';
import type { PlayerState } from '../../../game/domain/types';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const OBSERVATION_SIZE = OBSERVATION.size;

export function observe(s: PlayerState): number[] {
  const gaps = LEVEL.ground.slice(0, -1).map((part, i) => ({
    left: part.end,
    right: LEVEL.ground[i + 1].start,
  }));
  const nextGap = gaps.find((gap) => gap.right >= s.x);
  const gapDistance = nextGap ? nextGap.left - s.x : OBSERVATION.gapDistance;
  const gapWidth = nextGap ? nextGap.right - nextGap.left : 0;

  return [
    clamp(s.x / LEVEL.width, 0, 1), // progress
    clamp(gapDistance / OBSERVATION.gapDistance, -1, 1), // distance to next gap
    clamp(gapWidth / OBSERVATION.gapWidth, 0, 1), // width of next gap
    clamp((LEVEL.groundY - s.y) / OBSERVATION.height, -1, 1), // height above ground
    clamp(s.vx / RUN_SPEED, -1, 1), // horizontal speed
    clamp(s.vy / OBSERVATION.verticalSpeed, -1, 1), // vertical speed
    s.grounded ? 1 : 0, // grounded
    clamp((LEVEL.goalX - s.x) / LEVEL.width, 0, 1), // distance to goal
  ];
}
