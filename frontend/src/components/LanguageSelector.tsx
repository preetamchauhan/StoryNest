import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { languages } from '../types/language';

const LanguageSelector: React.FC = () => {
  const { currentLanguage, setLanguage, t, isLanguageSelectionDisabled } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => !isLanguageSelectionDisabled && setIsOpen(!isOpen)}
        disabled={isLanguageSelectionDisabled}
        className={`flex items-center gap-2 px-3 py-2 rounded-full shadow-md transition-all border ${
          isLanguageSelectionDisabled
            ? 'bg-gray-200 dark:bg-gray-400 text-gray-500 border-gray-300 dark:border-gray-600 cursor-not-allowed'
            : 'bg-white/80 dark:bg-gray-800 hover:bg-white dark:hover:bg-gray-700 hover:scale-105 border-purple-200 dark:border-purple-700 cursor-pointer'
        }`}
      >
        {/* Flag */}
        <span className="text-lg">{currentLanguage.flag}</span>

        {/* Code */}
        <span className="font-medium text-purple-700 dark:text-purple-300">
          {currentLanguage.code.toUpperCase()}
        </span>

        {/* Dropdown arrow */}
        <span
          className={`text-sm text-purple-600 dark:text-purple-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        >
          ▼
        </span>
      </button>



      {isOpen && !isLanguageSelectionDisabled && (
        <>
          {/* Backdrop (click to close) */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-purple-200 dark:border-purple-700 z-20 min-w-[200px] max-h-[300px] overflow-y-auto">
            <div className="p-2">
              <div className="text-xs font-medium text-purple-600 dark:text-purple-400 px-3 py-2 border-b border-purple-100 dark:border-purple-700">
                {t('language')}
              </div>

              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => {
                    setLanguage(language);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl transition-all hover:bg-purple-50 dark:hover:bg-purple-900/30 ${
                    currentLanguage.code === language.code
                      ? 'bg-purple-100 dark:bg-purple-900/50 border-2 border-purple-300 dark:border-purple-600'
                      : ''
                  }`}
                >
                  <span className="text-xl">{language.flag}</span>
                  <div className="text-left flex-1">
                    <div className="font-medium text-gray-800 dark:text-gray-200">
                      {language.nativeName}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {language.name}
                    </div>
                  </div>
                  {currentLanguage.code === language.code && (
                    <span className="text-purple-600 dark:text-purple-400">✔</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;

