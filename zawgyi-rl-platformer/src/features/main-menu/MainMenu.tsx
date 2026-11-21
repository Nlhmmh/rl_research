import { useTranslation } from 'react-i18next';
import type { Mode } from '../../app/navigation';
import styles from './MainMenu.module.css';

const emblemUrl = `${import.meta.env.BASE_URL}assets/branding/alchemist-emblem.png`;

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
