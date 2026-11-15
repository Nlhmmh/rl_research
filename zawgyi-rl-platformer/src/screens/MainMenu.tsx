import { useTranslation } from 'react-i18next';
import emblemUrl from '../assets/Burmese_Alchemist_Glowing_Stone_Emblem.png';
import type { Mode } from '../navigation';
import styles from './MainMenu.module.css';

export function MainMenu({ onNavigate }: { onNavigate: (mode: Mode) => void }) {
  const { t } = useTranslation();
  return (
    <main className={styles.screen}>
      <img className={styles.brandMark} src={emblemUrl} alt="" aria-hidden="true" />
      <h1>{t('gameTitle')}</h1>
      <p className={styles.subtitle}>{t('subtitle')}</p>
      <div className={styles.actions}>
        <button className="btn-primary" onClick={() => onNavigate('human')}>
          {t('menu.play')}
        </button>
        <button className="btn-secondary" onClick={() => onNavigate('watch')}>
          {t('menu.watch')}
        </button>
        <button className="btn-secondary" onClick={() => onNavigate('train')}>
          {t('menu.train')}
        </button>
      </div>
    </main>
  );
}
