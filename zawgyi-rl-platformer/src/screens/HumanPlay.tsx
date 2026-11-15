import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameCanvas } from '../game/GameCanvas';
import { HimavantaEnvironment } from '../game/environment';
import { LEVEL } from '../game/level';
import type { AgentSnapshot } from '../game/types';
import styles from './HumanPlay.module.css';

import { createHumanGame, type Outcome } from '../game/humanGame';
import { humanSnapshot } from '../game/snapshot';

export function HumanPlay({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const gameRef = useRef<ReturnType<typeof createHumanGame> | null>(null);
  const [paused, setPaused] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [snapshots, setSnapshots] = useState<AgentSnapshot[]>(() => [
    humanSnapshot(new HimavantaEnvironment(), 0),
  ]);

  useEffect(() => {
    const game = createHumanGame({
      onPause: setPaused,
      onOutcome: setOutcome,
      onSnapshot: setSnapshots,
    });
    gameRef.current = game;
    game.start();
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  function togglePause() {
    gameRef.current?.togglePause();
  }

  function restart() {
    gameRef.current?.restart();
  }

  const x = snapshots[0]?.x ?? LEVEL.spawnX;
  const progress = Math.min(100, Math.round((100 * x) / LEVEL.goalX));

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <button className="btn-secondary" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <div className={styles.title}>
          <h2>{t('menu.play')}</h2>
          <p className={styles.eyebrow}>( HUMAN MODE )</p>
          <p className={styles.hint}>{t('game.controls')}</p>
        </div>
      </header>
      <section className={styles.panel}>
        <div className={styles.controls}>
          <button className="btn-secondary" onClick={togglePause}>
            {paused ? t('common.resume') : t('common.pause')}
          </button>
          <button className="btn-secondary" onClick={restart}>
            {t('common.restart')}
          </button>
          <span>
            {t('game.progress')}: {progress}%
          </span>
          {outcome && (
            <p className={styles.outcome} role="status">
              {t(outcome === 'success' ? 'game.success' : 'game.failed')}
            </p>
          )}
        </div>
        <GameCanvas snapshots={snapshots} cameraMode="follow" />
      </section>
    </main>
  );
}
