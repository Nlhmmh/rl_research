import { OBSERVATION, Q_BINS } from '../../../../game/domain/level';
import { observe } from '../../../domain/policies/observation';
import type { PlayerState } from '../../../../game/domain/types';

// Share learning across equivalent gap approaches instead of splitting by map
// position. Use finer distance bins near takeoff/landing and coarse bins far away.
export function qStateKey(state: PlayerState): string {
  const v = observe(state);
  const distance = v[1] * OBSERVATION.gapDistance;
  const gapDistanceBucket =
    Math.abs(distance) <= Q_BINS.nearGapRange
      ? `near:${Math.floor(distance / Q_BINS.nearGapStep)}`
      : `far:${Math.floor(distance / Q_BINS.farGapStep)}`;
  const gapWidthBucket = Math.floor(v[2] * Q_BINS.gapWidth); // 3 buckets for gap width
  const heightBucket = Math.floor((v[3] + 1) * Q_BINS.height); // 8 buckets for height above ground
  const verticalSpeedBucket = Math.floor((v[5] + 1) * Q_BINS.verticalSpeed); // 8 buckets for vertical speed
  const groundedBucket = v[6]; // 2 buckets for grounded (0 or 1)
  return [
    gapDistanceBucket,
    gapWidthBucket,
    heightBucket,
    verticalSpeedBucket,
    groundedBucket,
  ].join('|');
}
