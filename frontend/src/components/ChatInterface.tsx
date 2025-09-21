import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import StoryModal from './StoryModel';
import StoryActions from './StoryActions';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatInterfaceProps {
  events: any[];
  isStreaming: boolean;
  onBack: () => void;
  mode?: 'surprise' | 'guided' | 'freeform';
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ events, isStreaming, onBack, mode = 'surprise' }) => {
  const { t } = useLanguage();
  const [modalStory, setModalStory] = useState<{title?: string, text: string} | null>(null);

  const getModeInfo = () => {
    switch (mode) {
      case 'surprise':
        return { icon: '🎲', title: t('surpriseMe'), backText: 'Back to Surprise' };
      case 'guided':
        return { icon: '📘', title: t('guidedStory'), backText: 'Back to Guided' };
      case 'freeform':
        return { icon: '✍️', title: t('myOwnIdea'), backText: 'Back to My Idea' };
      default:
        return { icon: '🤖', title: 'Story Assistant', backText: 'Back to Menu' };
    }
  };

  const modeInfo = getModeInfo();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollTop = messagesEndRef.current.scrollHeight;
    }
  }, [events]);

  // Auto-scroll when streaming or new content appears
  useEffect(() => {
    const scrollContainer = messagesEndRef.current;
    if (scrollContainer) {
      const scrollToBottom = () => {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      };

      // Immediate scroll
      scrollToBottom();

      // Delayed scroll to handle dynamic content
      const timeoutId = setTimeout(scrollToBottom, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [events, isStreaming]);

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 
      dark:from-purple-900/20 dark:via-pink-900/20 dark:to-blue-900/20 rounded-t-2xl shadow-2xl border-t-4 
      border-purple-200 min-h-0">
<div className="bg-gradient-to-r from-purple-100/90 to-pink-100/90 dark:bg-gradient-to-r
dark:from-purple-900/90 dark:to-pink-900/90 backdrop-blur-sm border-b-2 border-purple-200 shadow-lg
p-3 sm:p-4 flex-shrink-0 rounded-t-2xl">

  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 
        rounded-full flex items-center justify-center shadow-lg ${ 
          isStreaming ? 'animate-pulse' : '' }`}>
        <span className={`text-white text-base sm:text-lg ${ 
          isStreaming ? 'animate-bounce' : '' }`}>
          {isStreaming ? '🤖' : '👑'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-lg">{modeInfo.icon}</span>
        <h2 className="font-bold text-base sm:text-lg bg-gradient-to-r from-purple-600 to-pink-600 
          bg-clip-text text-transparent">{modeInfo.title}</h2>
      </div>

      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">
        {isStreaming ? '✨ ' + t('creatingMagic') : '🌈 ' + t('readyToHelp')}
      </p>
    </div>

    <Button 
      onClick={onBack}
      variant="outline"
      size="sm"
      className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 
      bg-white/80 hover:bg-white border border-purple-300 hover:border-purple-400 text-purple-600
      hover:text-purple-700 shadow-md">

      <span className="text-sm sm:text-base">×</span>
      <span className="hidden sm:inline">{modeInfo.backText}</span>
      <span className="sm:hidden">{modeInfo.icon}</span>
    </Button>
  </div>
</div>

{/* Chat Messages */}
<div className="flex-1 overflow-y-auto p-2 sm:p-4 space-y-3 sm:space-y-4" ref={messagesEndRef}>
  {events.map((event, index) => {
    if (event.type === 'log') {
      return (
        <div key={index} className="flex items-start gap-2 sm:gap-4 animate-fade-in">
          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 
            rounded-full flex items-center justify-center text-white text-sm sm:text-lg flex-shrink-0
            mt-1 shadow-md">
          </div>

          <div className="flex-1 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 
            dark:to-purple-900/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-lg border-2 
            border-blue-200 dark:border-blue-700 max-w-full sm:max-w-3xl transform hover:translate-x-1
            hover:-translate-x-2 transition-transform">
                    <p className="text-xs sm:text-sm leading-relaxed font-medium text-blue-800
          dark:text-blue-200 whitespace-pre-line">{event.data.message}</p>
      </div>
    </div>
  )
}

if (event.type === 'error') {
  return (
    <div key={index} className="flex items-start gap-2 sm:gap-4">
      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500 rounded-full flex items-center 
        justify-center text-white text-xs sm:text-sm flex-shrink-0 mt-1 shadow-md">
      </div>
      <div className="flex-1 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/30 
        dark:to-pink-900/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-lg border-2 border-red-200 
        dark:border-red-700 max-w-full sm:max-w-3xl">
        <div className="text-xs sm:text-sm text-red-700 dark:text-red-300 font-medium 
          whitespace-pre-line">
          {(() => {
            const errorText = event.data.error;
            if (errorText.includes('✦')) {
              return errorText.split('✦').map((part: string, i: number) => {
                if (i % 2 === 1 && part.trim()) {
                  // This is the text between sparkles - highlight it with copy button
                  const suggestion = part.trim();
                  return (
                    <span key={i} className="inline-flex items-center gap-2 bg-gradient-to-r 
                      from-yellow-200 to-orange-200 dark:from-yellow-800 dark:to-orange-800 px-3 
                      py-2 rounded-lg font-bold text-purple-800 dark:text-purple-200 my-1 shadow-md 
                      border border-yellow-300">
                      <span>✨ {suggestion} ✨</span>
                      <button
                        onClick={async (e) => {
                          try {
                            const btn = e.target as HTMLButtonElement;
                            btn.classList.add('animate-pulse', 'scale-110');
                            await navigator.clipboard.writeText(suggestion);
                            const original = btn.textContent;
                            btn.textContent = '✓';
                            setTimeout(() => {
                              btn.textContent = original;
                              btn.classList.remove('animate-pulse', 'scale-110');
                            }, 1000);
                          } catch (err) {
                            console.error('Failed to copy:', err);
                          }
                        }}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-1 py-0.5 
                          rounded transition-all duration-200 flex-shrink-0 active:scale-95"
                        title="Copy suggestion"
                      >
                        📋
                      </button>
                    </span>
                  );
                }
                return <span key={i}>{i === 0 ? 'Oops! ' : ''}{part}</span>;
              });
            }
            return `Oops! ${errorText}`;
          })()}
          {' 😂'}
          </div>
          </div>
          </div>
  );
}
if (event.type === 'story_complete') {
  const storyData = event.data;

  return (
    <div key={index} className="flex items-start gap-2 sm:gap-4">
      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 
        rounded-full flex items-center justify-center text-white text-sm sm:text-lg flex-shrink-0 
        mt-1 shadow-md">
      </div>
      <div className="flex-1">
        <div
          className="bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 
          dark:from-yellow-900/30 dark:via-orange-900/30 dark:to-pink-900/30 rounded-2xl 
          sm:rounded-3xl p-4 sm:p-6 shadow-xl border-4 border-yellow-300 dark:border-yellow-600 
          max-w-full sm:max-w-4xl transform hover:translate-x-1 sm:hover:translate-x-2 
          transition-transform cursor-pointer hover:shadow-2xl"
          onClick={() => setModalStory({title: storyData.title, text: storyData.story_text})}
          title="Click to read full story"
        >
          {storyData.title && (
            <h3 className="text-lg sm:text-xl font-bold text-purple-700 dark:text-purple-300 mb-3">
              {storyData.title}
            </h3>
          )}
          <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap 
            text-sm sm:text-base font-medium line-clamp-4">
            {storyData.story_text}
          </p>
          <div className="mt-3 text-center">
            <span className="text-sm sm:text-base text-purple-600 dark:text-purple-400 
              bg-purple-100 dark:bg-purple-900/30 px-4 py-2 rounded-full font-medium shadow-md 
              hover:bg-purple-200 dark:hover:bg-purple-800/40 transition-colors">
              {t('clickToRead')}
            </span>
          </div>
        </div>

        {/* Story Actions */}
        <div className="mt-3">
          <StoryActions
            storyTitle={storyData.title}
            storyText={storyData.story_text}
            size="small"
            originalPrompt={storyData.original_prompt || storyData.story_text}
          />
        </div>
      </div>
    </div>
  );
}
if (event.type === 'final') {
  return (
    <div key={index} className="flex items-start gap-2 sm:gap-4">
      <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-500 rounded-full flex items-center 
        justify-center text-white text-xs sm:text-sm flex-shrink-0 mt-1 shadow-md">
      </div>
      <div className="flex-1 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 
        dark:to-emerald-900/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-lg border-2 
        border-green-300 dark:border-green-600 max-w-full sm:max-w-3xl transform 
        hover:translate-x-1 sm:hover:translate-x-2 transition-transform">
        <p className="text-xs sm:text-sm text-green-700 dark:text-green-300 font-bold">
          🌟 Your magical story is ready! ✨📚
        </p>
      </div>
    </div>
  )
}

return null;
})}

{/* Real-time streaming story display */}
{(() => {
  const storyChunks = events.filter(e => e.type === 'story_chunk');
  const hasCompleteStory = events.some(e => e.type === 'story_complete');

  if (storyChunks.length > 0 && !hasCompleteStory) {
    const streamingText = storyChunks.map(e=>e.data).join('');
    return (
      <div className="flex items-start gap-2 sm:gap-4">
        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 
          rounded-full flex items-center justify-center text-white text-sm sm:text-lg flex-shrink-0 
          mt-1 shadow-md animate-pulse">
            <span className="animate-bounce">🤖</span>
        </div>
        <div className="flex-1">
          <div className="bg-gradient-to-br from-yellow-100 via-orange-100 to-pink-100 
            dark:from-yellow-900/30 dark:via-orange-900/30 dark:to-pink-900/30 rounded-2xl 
            sm:rounded-3xl p-4 sm:p-6 shadow-xl border-4 border-yellow-300 dark:border-yellow-600 
            max-w-full sm:max-w-4xl animate-pulse transform hover:translate-x-1 
            hover:translate-x-2 transition-transform">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap 
                text-sm sm:text-base font-medium">
                {streamingText}
                {isStreaming && <span className="animate-bounce text-purple-500 ml-1">✨</span>}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null;
})()}
{isStreaming && events.length === 0 && (
  <div className="flex items-start gap-2 sm:gap-4">
    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full 
      flex items-center justify-center text-white text-sm sm:text-lg animate-pulse flex-shrink-0 mt-1 
      shadow-md">
        <span className="animate-bounce">🤖</span>
    </div>
    <div className="flex-1 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 
      dark:to-pink-900/30 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-lg border-2 border-purple-200 
      dark:border-purple-700 max-w-full sm:max-w-3xl animate-pulse">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex space-x-1">
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-purple-400 to-pink-400 
            rounded-full animate-bounce"></div>
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-purple-400 to-pink-400 
            rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
          <div className="w-2 h-2 sm:w-3 sm:h-3 bg-gradient-to-r from-purple-400 to-pink-400 
            rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
        </div>
        <span className="text-xs sm:text-sm text-purple-700 dark:text-purple-300 font-bold">
          {t('creatingMagic')} ✨
        </span>
      </div>
    </div>
  </div>
)}
</div>
{/* Story Modal */}
<StoryModal
  isOpen={!!modalStory}
  onClose={() => setModalStory(null)}
  title={modalStory?.title}
  storyText={modalStory?.text || ''}
/>
</div>
  );
};

export default ChatInterface;



           


