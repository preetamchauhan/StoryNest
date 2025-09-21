import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, languages } from '../types/language';
import { getTranslation } from '../translations';

interface LanguageContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
  isLanguageSelectionDisabled: boolean;
  setIsLanguageSelectionDisabled: (disabled: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('selectedLanguage');
    if (saved) {
      const savedLang = languages.find(lang => lang.code === saved);
      if (savedLang) return savedLang;
    }
    return languages[0]; // Default to English
  });

  const [isLanguageSelectionDisabled, setIsLanguageSelectionDisabled] = useState(false);

  const setLanguage = (language: Language) => {
    setCurrentLanguage(language);
    localStorage.setItem('selectedLanguage', language.code);

    // Update document direction for RTL languages with error handling
    try {
      document.documentElement.dir = language.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = language.code;

      // Add body class for RTL styling
      if (language.rtl) {
        document.body.classList.add('rtl-mode');
        document.body.classList.remove('ltr-mode');
      } else {
        document.body.classList.add('ltr-mode');
        document.body.classList.remove('rtl-mode');
      }
    } catch (error) {
      console.warn('Failed to update document direction:', error);
    }
  };

  const t = (key: string): string => {
    return getTranslation(currentLanguage.code, key as any);
  };

  useEffect(() => {
    // Set initial document properties with error handling
    try {
      document.documentElement.dir = currentLanguage.rtl ? 'rtl' : 'ltr';
      document.documentElement.lang = currentLanguage.code;

      // Add body class for RTL styling
      if (currentLanguage.rtl) {
        document.body.classList.add('rtl-mode');
        document.body.classList.remove('ltr-mode');
      } else {
        document.body.classList.add('ltr-mode');
        document.body.classList.remove('rtl-mode');
      }
    } catch (error) {
      console.warn('Failed to set initial document properties:', error);
    }
  }, [currentLanguage]);

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, t, isLanguageSelectionDisabled, setIsLanguageSelectionDisabled }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
