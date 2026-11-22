import { useTranslation } from 'react-i18next';
import { Modes, type Mode } from '../../app/navigation';
import { IllustratedButton } from '../../shared/ui/IllustratedButton';
import styles from './MainMenu.module.css';

const emblemUrl = `${import.meta.env.BASE_URL}assets/branding/alchemist-emblem.png`;

export function MainMenu({ onNavigate }: { onNavigate: (mode: Mode) => void }) {
  const { t } = useTranslation();
  return (
    <main className={styles.screen}>
      <img className={styles.brandMark} src={emblemUrl} alt="" aria-hidden="true" />
      <div style={{ height: 40 }} />
      <h1>{t('gameTitle')}</h1>
      <p className={styles.subtitle}>{t('subtitle')}</p>
      <div className={styles.actions}>
        <IllustratedButton onClick={() => onNavigate(Modes.Human)}>
          {t('menu.play')}
        </IllustratedButton>
        <IllustratedButton variant="secondary" onClick={() => onNavigate(Modes.Watch)}>
          {t('menu.watch')}
        </IllustratedButton>
        <IllustratedButton variant="secondary" onClick={() => onNavigate(Modes.Train)}>
          {t('menu.train')}
        </IllustratedButton>
      </div>
    </main>
  );
}
