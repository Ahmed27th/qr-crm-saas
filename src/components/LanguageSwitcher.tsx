import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage } from '../i18n';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
] as const;

type LangCode = typeof LANGUAGES[number]['code'];

export function LanguageSwitcher({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (code: LangCode) => {
    setLanguage(code);
    setOpen(false);
  };

  if (variant === 'minimal') {
    return (
      <div className="lang-switcher minimal" ref={ref}>
        <button className="lang-switcher-trigger" onClick={() => setOpen(!open)} title={current.label}>
          {current.flag}
        </button>
        {open && (
          <div className="lang-switcher-dropdown">
            {LANGUAGES.map(l => (
              <button key={l.code} className={`lang-option ${l.code === current.code ? 'active' : ''}`} onClick={() => handleSelect(l.code)}>
                <span className="lang-flag">{l.flag}</span>
                <span className="lang-name">{l.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="lang-switcher" ref={ref}>
      <button className="lang-switcher-trigger" onClick={() => setOpen(!open)}>
        <span className="lang-flag">{current.flag}</span>
        <span className="lang-name">{current.label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="m6 9 6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="lang-switcher-dropdown">
          {LANGUAGES.map(l => (
            <button key={l.code} className={`lang-option ${l.code === current.code ? 'active' : ''}`} onClick={() => handleSelect(l.code)}>
              <span className="lang-flag">{l.flag}</span>
              <span className="lang-name">{l.label}</span>
              {l.code === current.code && <span className="lang-check">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
