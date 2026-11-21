import { ACTION, type Action } from '../../modules/game/domain/types';

export function commandFromKey(code: string): 'pause' | 'restart' | null {
  if (code === 'KeyP' || code === 'Escape') return 'pause';
  if (code === 'KeyR') return 'restart';
  return null;
}

export function shouldPreventDefault(code: string): boolean {
  return (
    commandFromKey(code) !== null || ['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp'].includes(code)
  );
}

export function actionFromKeys(keys: Set<string>): Action {
  const left = keys.has('ArrowLeft') || keys.has('KeyA');
  const right = keys.has('ArrowRight') || keys.has('KeyD');
  const jump = keys.has('Space') || keys.has('ArrowUp') || keys.has('KeyW');

  if (jump && left && !right) return ACTION.JUMP_LEFT;
  if (jump && right && !left) return ACTION.JUMP_RIGHT;
  if (jump) return ACTION.JUMP;
  if (left && !right) return ACTION.LEFT;
  if (right && !left) return ACTION.RIGHT;
  return ACTION.IDLE;
}
