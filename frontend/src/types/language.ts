export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

export const languages: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: 'us' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: 'DE' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: 'FR' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: 'es' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', flag: 'IN' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: 'JP' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: 'KR' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: 'sa', rtl: true }
];

export type TranslationKey =
  | 'storyNest'
  | 'surpriseMe'
  | 'guidedStory'
  | 'myOwnIdea'
  | 'listen'
  | 'save'
  | 'images'
  | 'generateStory'
  | 'backToMenu'
  | 'clickToRead'
  | 'listeningToStory'
  | 'creatingMagic'
  | 'readyToHelp'
  | 'hopeYouEnjoyed'
  | 'chooseTheme'
  | 'mainCharacter'
  | 'companion'
  | 'setting'
  | 'challenge'
  | 'tone'
  | 'values'
  | 'tellUsIdea'
  | 'language'
  | 'letAiCreate'
  | 'readyForAdventure'
  | 'clickButtonBelow'
  | 'chooseAdventure'
  | 'storyBook';

export type Translations = Record<TranslationKey, string>;
