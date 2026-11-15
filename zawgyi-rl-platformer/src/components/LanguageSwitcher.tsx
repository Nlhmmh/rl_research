import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitcher.module.css';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  async function switchLanguage(language: string) {
    await i18n.changeLanguage(language);
    localStorage.setItem('zawgyi-language', language);
    document.documentElement.lang = language;
  }

  return (
    <div className={styles.languageSwitcherContainer}>
      <label>
        <span className="sr-only">Language / ဘာသာစကား</span>
        <select
          aria-label="Language / ဘာသာစကား"
          value={i18n.resolvedLanguage?.startsWith('my') ? 'my' : 'en'}
          onChange={(e) => void switchLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="my">မြန်မာ</option>
        </select>
      </label>
    </div>
  );
}
