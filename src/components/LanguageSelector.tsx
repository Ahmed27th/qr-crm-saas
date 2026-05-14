import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';

const languages = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'ru', name: 'Русский' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'ary', name: 'الدارجة المغربية', dir: 'rtl' }
];

export function LanguageSelector() {
  const { i18n } = useTranslation();

  const changeLanguage = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const code = e.target.value;
    i18n.changeLanguage(code);
    const selectedLang = languages.find(l => l.code === code);
    document.documentElement.dir = selectedLang?.dir || 'ltr';
  };

  return (
    <div className="flex items-center gap-2">
      <Globe size={20} style={{ color: 'var(--text-secondary)' }} />
      <select 
        value={i18n.language} 
        onChange={changeLanguage}
        style={{
          backgroundColor: 'var(--bg-secondary)',
          color: 'var(--text-primary)',
          borderColor: 'var(--border-color)',
          padding: '0.4rem 0.8rem',
          borderRadius: '8px',
          borderWidth: '1px',
          borderStyle: 'solid',
          outline: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit'
        }}
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code} style={{ color: '#000' }}>
            {lang.name}
          </option>
        ))}
      </select>
    </div>
  );
}
