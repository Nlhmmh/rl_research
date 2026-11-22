import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AgentStatsTable } from './AgentStatsTable';
import { TrainingChart } from './TrainingCharts';
import { GameCanvas } from '../../modules/game/presentation/GameCanvas';
import { TRAINING } from '../../modules/game/domain/level';
import { createTrainGame, type AgentCount } from '../../modules/training/application/trainGame';
import type { AgentSnapshot } from '../../modules/game/domain/types';
import type {
  AgentStats,
  Algorithm,
  HistoryPoint,
  TrainingSpeed,
} from '../../modules/reinforcement-learning/infrastructure/workers/protocol';
import styles from './TrainAI.module.css';

export function TrainAI({ onBack, onWatch }: { onBack: () => void; onWatch: () => void }) {
  const { t } = useTranslation();
  const [algorithm, setAlgorithm] = useState<Algorithm>('q-learning');
  const [agentCount, setAgentCount] = useState<AgentCount>(1);
  const [stepBudget, setStepBudget] = useState<number>(TRAINING.defaultStepBudget);
  const [speed, setSpeed] = useState<TrainingSpeed>('max');
  const [renderAgents, setRenderAgents] = useState(true);
  const [snapshots, setSnapshots] = useState<AgentSnapshot[]>([]);
  const [statsById, setStatsById] = useState<Record<string, AgentStats>>({});
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [cameraMode, setCameraMode] = useState<'overview' | 'follow'>('overview');
  const [selectedId, setSelectedId] = useState('AI-1');
  const [canExtend, setCanExtend] = useState(false);
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('Ready to train independent agents.');
  const gameRef = useRef<ReturnType<typeof createTrainGame> | null>(null);

  useEffect(() => {
    const game = createTrainGame({
      onSnapshots: setSnapshots,
      onStatsReset: () => setStatsById({}),
      onHistoryReset: () => setHistory([]),
      onStats: (stats) => setStatsById((current) => ({ ...current, [stats.id]: stats })),
      onHistory: (point) => setHistory((current) => [...current.slice(-7999), point]),
      onActive: setActive,
      onExtendAvailable: setCanExtend,
      onMessage: setMessage,
      onAlgorithm: setAlgorithm,
      onAgentCount: setAgentCount,
      onSpeed: setSpeed,
    });
    gameRef.current = game;
    return () => {
      game.dispose();
      gameRef.current = null;
    };
  }, []);

  const stats = useMemo(
    () => Object.values(statsById).sort((a, b) => a.id.localeCompare(b.id)),
    [statsById],
  );
  const agentIds = Array.from({ length: agentCount }, (_, index) => `AI-${index + 1}`);

  function start() {
    gameRef.current?.start({ algorithm, agentCount, stepBudget, speed, renderAgents });
  }
  function pause() {
    gameRef.current?.pause();
  }
  function resume() {
    gameRef.current?.resume();
  }
  function stop() {
    gameRef.current?.stop();
  }
  function updateSpeed(value: TrainingSpeed) {
    gameRef.current?.updateSpeed(value);
  }
  async function save() {
    await gameRef.current?.save(algorithm);
  }
  async function load() {
    await gameRef.current?.load();
  }

  return (
    <main className={styles.screen}>
      <header className={styles.header}>
        <button className="btn-secondary" onClick={onBack}>
          ← {t('common.back')}
        </button>
        <div>
          <p className={styles.eyebrow}>MULTI-AGENT LEARNING LAB</p>
          <h2>{t('menu.train')}</h2>
        </div>
        <button className="btn-secondary" onClick={onWatch}>
          {t('training.watchTrained')}
        </button>
      </header>
      <div className={styles.workspace}>
        <section className={`${styles.panel} ${styles.controlsGrid}`}>
          <label>
            {t('training.visualization')}
            <select
              value={renderAgents ? 'on' : 'off'}
              onChange={(event) => {
                const enabled = event.target.value === 'on';
                setRenderAgents(enabled);
                gameRef.current?.setRendering(enabled);
              }}
            >
              <option value="on">{t('training.renderOn')}</option>
              <option value="off">{t('training.renderOff')}</option>
            </select>
          </label>
          <label>
            {t('training.algorithm')}
            <select
              disabled={active}
              value={algorithm}
              onChange={(e) => setAlgorithm(e.target.value as Algorithm)}
            >
              <option value="q-learning">Q-Learning</option>
              <option value="dqn">DQN</option>
            </select>
          </label>
          <label>
            {t('training.agents')}
            <select
              disabled={active}
              value={agentCount}
              onChange={(e) => setAgentCount(Number(e.target.value) as AgentCount)}
            >
              {[1, 2, 4, 8].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            {t('training.stepBudget')}
            <input
              disabled={active}
              type="number"
              min="1"
              max={TRAINING.maxStepBudget}
              value={stepBudget}
              onChange={(e) => setStepBudget(Number(e.target.value))}
            />
          </label>
          <label>
            {t('training.speed')}
            <select
              value={speed}
              onChange={(e) =>
                updateSpeed(
                  e.target.value === 'max' ? 'max' : (Number(e.target.value) as TrainingSpeed),
                )
              }
            >
              <option value="1">1×</option>
              <option value="2">2×</option>
              <option value="4">4×</option>
              <option value="max">Max</option>
            </select>
          </label>
          <label>
            {t('training.camera')}
            <select
              value={cameraMode}
              onChange={(e) => setCameraMode(e.target.value as 'overview' | 'follow')}
            >
              <option value="overview">{t('training.overview')}</option>
              <option value="follow">{t('training.follow')}</option>
            </select>
          </label>
          {cameraMode === 'follow' && (
            <label>
              Agent
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                {agentIds.map((id) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </label>
          )}
          <div className={styles.buttons}>
            <button className="btn-primary" disabled={active} onClick={start}>
              {t('common.start')}
            </button>
            {canExtend && (
              <button
                className="btn-secondary"
                disabled={active}
                onClick={() => gameRef.current?.extend(stepBudget)}
              >
                {t('training.extend')}
              </button>
            )}
            <button className="btn-secondary" disabled={!active} onClick={pause}>
              {t('common.pause')}
            </button>
            <button className="btn-secondary" disabled={!active} onClick={resume}>
              {t('common.resume')}
            </button>
            <button className="btn-secondary" onClick={stop}>
              {t('common.stop')}
            </button>
            <button className="btn-secondary" onClick={start}>
              {t('common.reset')}
            </button>
            <button className="btn-secondary" onClick={() => void save()}>
              {t('common.save')}
            </button>
            <button className="btn-secondary" disabled={active} onClick={() => void load()}>
              {t('common.load')}
            </button>
          </div>
          <p className={styles.message} role="status">
            {message}
          </p>
        </section>
        <section className={`${styles.panel} ${styles.canvasPanel}`}>
          {renderAgents ? (
            <GameCanvas
              snapshots={snapshots}
              cameraMode={cameraMode}
              selectedAgentId={selectedId}
            />
          ) : (
            <p role="status">{t('training.renderDisabled')}</p>
          )}
        </section>
        <section className={styles.panel}>
          <AgentStatsTable stats={stats} selectedId={selectedId} onSelect={setSelectedId} />
        </section>
      </div>
      <div className={styles.charts}>
        <TrainingChart
          history={history}
          agentIds={agentIds}
          metric="reward"
          title="Episode rewards"
        />
        <TrainingChart
          history={history}
          agentIds={agentIds}
          metric="averageReward100"
          title="Moving average reward"
        />
        <TrainingChart
          history={history}
          agentIds={agentIds}
          metric="successRate100"
          title="Exploratory training success rate (%)"
        />
      </div>
    </main>
  );
}
