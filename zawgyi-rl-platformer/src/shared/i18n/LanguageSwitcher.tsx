import { useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from './LanguageSwitcher.module.css';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'my', label: 'မြန်မာ' },
] as const;

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const popupId = useId();
  const current = i18n.resolvedLanguage?.startsWith('my') ? languages[1] : languages[0];

  async function switchLanguage(language: string) {
    trigger.current?.focus();
    setOpen(false);
    await i18n.changeLanguage(language);
    localStorage.setItem('zawgyi-language', language);
    document.documentElement.lang = language;
  }

  return (
    <div
      className={styles.languageSwitcherContainer}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        event.stopPropagation();
        trigger.current?.focus();
        setOpen(false);
      }}
    >
      <button
        ref={trigger}
        type="button"
        className={styles.control}
        aria-label={`Language / ဘာသာစကား: ${current.label}`}
        aria-expanded={open}
        aria-controls={popupId}
        onClick={() => {
          trigger.current?.focus();
          setOpen(!open);
        }}
      >
        <span lang={current.code}>{current.label}</span>
      </button>
      <ul id={popupId} className={styles.popup} hidden={!open}>
        {languages.map(({ code, label }) => (
          <li key={code}>
            <button
              type="button"
              className={styles.option}
              aria-pressed={current.code === code}
              lang={code}
              onClick={() => void switchLanguage(code)}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
