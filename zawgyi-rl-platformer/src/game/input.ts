import type { Action } from '../game/types';

export function commandFromKey(code: string): 'pause' | 'restart' | null {
  if (code === 'KeyP' || code === 'Escape') return 'pause';
  if (code === 'KeyR') return 'restart';
  return null;
}

export function shouldPreventDefault(code: string): boolean {
  return commandFromKey(code) !== null ||
    ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(code);
}

export function actionFromKeys(keys: Set<string>): Action {
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const right = keys.has('ArrowRight') || keys.has('KeyD');
  const jump = keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW');

  if (jump && left && !right) return 4;
  if (jump && right && !left) return 5;
  if (jump) return 3;
  if (left && !right) return 1;
  if (right && !left) return 2;
  return 0;
}
