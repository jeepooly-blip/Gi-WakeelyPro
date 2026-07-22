import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TranslationDict, translations } from './i18n';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationDict;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Read from localStorage if exists, default to 'en' (English default)
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('wakeely_lang');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('wakeely_lang', lang);
  };

  const t = translations[language];
  const isRtl = language === 'ar';

  useEffect(() => {
    // Dynamic document metadata update
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
    
    // Add custom body alignments for clean styling if needed
    if (isRtl) {
      document.body.classList.add('rtl-active');
      document.body.classList.remove('ltr-active');
    } else {
      document.body.classList.add('ltr-active');
      document.body.classList.remove('rtl-active');
    }
  }, [language, isRtl]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, isRtl }}>
      <div style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
