import { expect, it } from 'vitest';
import { qStateKey } from './observation-q';
import { initialPlayerState } from './physics';

it('distinguishes nearby takeoff positions', () => {
  const state = initialPlayerState();
  expect(qStateKey({ ...state, x: 268 })).not.toBe(qStateKey({ ...state, x: 277 }));
});

it('reuses knowledge at equivalent gap approaches', () => {
  const state = initialPlayerState();
  expect(qStateKey({ ...state, x: 260 })).toBe(qStateKey({ ...state, x: 630 }));
});
