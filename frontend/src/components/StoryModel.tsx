import React from 'react';
import StoryActions from './StoryActions';
import { useLanguage } from '../contexts/LanguageContext';

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  storyText: string;
}

const StoryModal: React.FC<StoryModalProps> = ({ isOpen, onClose, title, storyText }) => {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border-4 border-yellow-300 dark:border-yellow-600 max-w-4xl w-full max-h-[90vh] flex flex-col animate-scale-in">
        
        {/* Header */}
        <div className="bg-purple-100 dark:bg-purple-900/50 rounded-t-3xl p-4 sm:p-6 border-b-4 border-yellow-300 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white text-lg sm:text-xl">📖</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-300">
                {title || 'Your Magical Story'}
              </h2>
            </div>
            <p className="text-sm text-purple-600 dark:text-purple-400">Click anywhere to read!</p>
            <button
              onClick={onClose}
              className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
              title="Close story"
            >
              <span className="text-lg sm:text-xl">✖</span>
            </button>
          </div>
        </div>

        {/* Story Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 min-h-0 scroll-smooth">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-2xl p-4 sm:p-6 border-2 border-yellow-200 dark:border-yellow-700">
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap text-base sm:text-lg font-medium">
              {storyText}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-purple-100 dark:bg-purple-900/50 rounded-b-3xl p-4 border-t-4 border-yellow-300 flex-shrink-0">
          <div className="space-y-3">
            <StoryActions
              storyTitle={title}
              storyText={storyText}
              size="large"
            />
            <div className="text-center">
              <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">
               ✨ {t('hopeYouEnjoyed')} ✨
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryModal;
