import { describe, expect, it } from 'vitest';
import { initialPlayerState } from '../../../game/domain/physics';
import { OBSERVATION_SIZE, observe } from './observation';

describe('observe', () => {
  it('returns exactly eight finite normalized features', () => {
    const values = observe(initialPlayerState());
    expect(values).toHaveLength(OBSERVATION_SIZE);
    expect(values.every(Number.isFinite)).toBe(true);
    expect(values.every((value) => value >= -1 && value <= 1)).toBe(true);
  });
});
