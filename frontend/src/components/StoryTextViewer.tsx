import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface StoryTextViewerProps {
  title: string;
  text: string;
  onClose: () => void;
}

const StoryTextViewer: React.FC<StoryTextViewerProps> = ({ title, text, onClose }) => {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-lg sm:rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-4 border-b bg-gradient-to-r from-purple-100 to-pink-100 rounded-t-lg sm:rounded-t-2xl">
          <h2 className="text-lg sm:text-2xl font-bold text-purple-700">📖 {title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all hover:scale-110"
          >
            ✖
          </button>
        </div>

        {/* Story Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="prose prose-lg max-w-none">
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 sm:p-6 border border-purple-200">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                {text}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t bg-gray-50 rounded-b-lg sm:rounded-b-2xl">
          <div className="flex justify-center">
            <button
              onClick={onClose}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryTextViewer;
