import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameCanvas } from '../../modules/game/presentation/GameCanvas';
import { HimavantaEnvironment } from '../../modules/game/domain/environment';
import { watchSnapshot } from '../../modules/game/application/snapshot';
import { ACTION_NAMES, type AgentSnapshot } from '../../modules/game/domain/types';
import { createWatchGame, type WatchSpeed } from './watchGame';
import { listPolicies, type SavedPolicy } from '../../modules/reinforcement-learning/infrastructure/persistence/checkpoints';
import styles from './WatchAI.module.css';

export function WatchAI({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const gameRef = useRef<ReturnType<typeof createWatchGame> | null>(null);
  const [snapshot, setSnapshot] = useState<AgentSnapshot>(() =>
    watchSnapshot(new HimavantaEnvironment(), 0, 1, 0),
  );
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState<WatchSpeed>(1);
  const [message, setMessage] = useState('Random untrained baseline selected.');
  const [policies, setPolicies] = useState<SavedPolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState('');
  const [loadingPolicy, setLoadingPolicy] = useState(false);

  useEffect(() => {
    const game = createWatchGame({
      onSnapshot: setSnapshot,
      onPause: setPaused,
      onSpeed: setSpeed,
      onMessage: setMessage,
    });
    gameRef.current = game;
    game.start();
    let cancelled = false;
    void listPolicies()
      .then((saved) => {
        if (!cancelled) setPolicies(saved);
      })
      .catch((error: unknown) => {
        if (!cancelled) setMessage(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  function restart() {
    gameRef.current?.restart();
  }
  function togglePause() {
    gameRef.current?.togglePause();
  }
  function changeSpeed(value: WatchSpeed) {
    gameRef.current?.changeSpeed(value);
  }
  function useRandom() {
    gameRef.current?.useRandom();
  }
  async function loadLatest() {
    await gameRef.current?.loadLatest();
  }

  async function loadSelectedPolicy() {
    if (!selectedPolicy) return;
    setLoadingPolicy(true);
    try {
      await gameRef.current?.loadPolicy(selectedPolicy);
    } finally {
      setLoadingPolicy(false);
    }
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <button className="btn-secondary" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <div>
          <p className={styles.eyebrow}>POLICY EVALUATION</p>
          <h2>{t('menu.watch')}</h2>
        </div>
      </header>
      <section className={styles.panel}>
        <div className={styles.controls}>
          <label className={styles.policyPicker}>
            {t('watch.savedPolicy')}
            <select
              value={selectedPolicy}
              disabled={loadingPolicy}
              onChange={(event) => setSelectedPolicy(event.target.value)}
            >
              <option value="">
                {t(policies.length ? 'watch.choosePolicy' : 'watch.noPolicies')}
              </option>
              {policies.map(({ metadata, compatible }) => (
                <option key={metadata.id} value={metadata.id} disabled={!compatible}>
                  {metadata.algorithm} · {metadata.id} · {t('training.episode')} {metadata.episode}
                  {metadata.details?.kind ? ` · ${metadata.details.kind.toUpperCase()}` : ''}
                  {metadata.details?.evaluation
                    ? ` · ${metadata.details.evaluation.success ? 'Goal reached' : 'Goal not reached'} · ${metadata.details.evaluation.steps} steps`
                    : ''}
                  {' · '}
                  {new Date(metadata.savedAt).toLocaleString()}
                  {!compatible ? ` · ${t('watch.incompatiblePolicy')}` : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn-primary"
            disabled={!selectedPolicy || loadingPolicy}
            onClick={() => void loadSelectedPolicy()}
          >
            {t('watch.loadSelected')}
          </button>
        </div>
        <div className={styles.controls}>
          <button className="btn-secondary" onClick={() => void loadLatest()}>
            Load latest trained AI
          </button>
          <button className="btn-secondary" onClick={useRandom}>
            Use random baseline
          </button>
          {[1, 2, 4].map((value) => (
            <button
              className={`btn-secondary ${speed === value ? styles.active : ''}`}
              key={value}
              onClick={() => changeSpeed(value as WatchSpeed)}
            >
              {value}×
            </button>
          ))}
          <button
            className="btn-secondary"
            disabled={snapshot.status === 'success' || snapshot.status === 'failed'}
            onClick={togglePause}
          >
            {paused ? t('common.resume') : t('common.pause')}
          </button>
          <button className="btn-secondary" onClick={restart}>
            {t('common.restart')}
          </button>
        </div>
        <p className={styles.message} role="status">
          {message}
        </p>
        <div className={styles.stats}>
          <span>Episode {snapshot.episode}</span>
          <span>Action: {ACTION_NAMES[snapshot.action]}</span>
          <span>Reward: {snapshot.reward.toFixed(1)}</span>
          <span>Status: {snapshot.status}</span>
        </div>
        <GameCanvas snapshots={[snapshot]} cameraMode="follow" selectedAgentId="WATCH-AI" />
        {(snapshot.status === 'success' || snapshot.status === 'failed') && (
          <div
            className={`${styles.outcome} ${snapshot.status === 'success' ? styles.success : styles.failure}`}
            role="status"
          >
            <strong>
              {t(snapshot.status === 'success' ? 'watch.goalReached' : 'watch.goalNotReached')}
            </strong>
            <p>{t('watch.restartHint')}</p>
          </div>
        )}
      </section>
    </main>
  );
}
