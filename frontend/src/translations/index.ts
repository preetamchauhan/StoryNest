import { Translations } from '../types/language';

import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { hi } from './hi';
import { ja } from './ja';
import { ko } from './ko';
import { ar } from './ar';

export const translations: Record<string, Translations> = {
  en,
  es,
  fr,
  de,
  hi,
  ja,
  ko,
  ar
};

export const getTranslation = (languageCode: string, key: keyof Translations): string => {
  return translations[languageCode]?.[key] || translations.en[key];
};
