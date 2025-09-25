import React, { useState } from 'react';
import KidAudioPlayer from './KidAudioPlayer';
import StoryViewer from './StoryViewer';
import LoadingProgress from './LoadingProgress';
import { useLanguage } from '../contexts/LanguageContext';
import { useApp } from '../contexts/AppContext';

interface StoryActionsProps {
  storyTitle?: string;
  storyText: string;
  size?: 'small' | 'large';
  originalPrompt?: string;
  autoSaveOnMount?: boolean;
}

const StoryActions: React.FC<StoryActionsProps> = ({ storyTitle, storyText, size = 'large', originalPrompt, autoSaveOnMount = false }) => {
  const { t, currentLanguage } = useLanguage();
  const { age } = useApp();

  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [storyData, setStoryData] = useState<{ framesData: any, imagePaths: string[] } | null>(null);
  const [showLoadingProgress, setShowLoadingProgress] = useState(false);
  const [loadingTask, setLoadingTask] = useState<'story' | 'images' | 'audio'>('story');

  React.useEffect(() => {
  if (!autoSaveOnMount) return;

  const handler = setTimeout(() => {
    autoSaveStory();
  }, 1000); // wait 1s before saving

  return () => clearTimeout(handler); // cleanup
}, [autoSaveOnMount, storyTitle, storyText, currentLanguage.code, age]);

  const handleListen = async () => {
    if (showAudioPlayer) {
      setShowAudioPlayer(false);
      return;
    }
    setIsGeneratingAudio(true);
    setLoadingTask('audio');
    setShowLoadingProgress(true);

    try {
      console.log('🎙️ Generating audio for story...');
      const response = await fetch('http://localhost:8000/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: storyText,
          language: currentLanguage.code,
          filename: `story_${Date.now()}`
        })
      });

      const result = await response.json();

      if (result.success) {
        const audioUrl = `http://localhost:8000${result.audio_path}`;
        setGeneratedAudioUrl(audioUrl);
        setShowAudioPlayer(true);
        console.log('✅ Audio generated, opening player');

        // Auto-save to DB after audio generation with the database audio URL
        await autoSaveStory(audioUrl, storyData);
      } else {
        alert(`❌ Audio generation failed: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Failed to generate audio: ${error}`);
    } finally {
      setIsGeneratingAudio(false);
      setShowLoadingProgress(false);
    }
  };

  const autoSaveStory = async (audioUrl?: string | null, imageData?: any) => {
    setIsSaving(true);
    setLoadingTask('story');
    setShowLoadingProgress(true);

    try {
      // Create a consistent story ID based on story content to avoid duplicates
      const storyId = btoa(encodeURIComponent((storyTitle || 'My Story') + storyText.substring(0, 100))).replace(
        /[^a-zA-Z0-9]/g,
        ''
      ).substring(0, 20);

      const savedStory = {
        id: storyId,
        title: storyTitle || 'My Story',
        text: storyText,
        language: currentLanguage.code,
        age,
        audioUrl: audioUrl || generatedAudioUrl || null,
        framesData: imageData?.framesData || storyData?.framesData || null,
        imagePaths: imageData?.imagePaths || storyData?.imagePaths || null
      };

      console.log('💾 Saving story with data:', savedStory);

      const response = await fetch('http://localhost:8000/api/save-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ story: savedStory })
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Story saved to database successfully');
        console.log('📦 Saved story data:', savedStory);
      } else {
        console.error('❌ Failed to save story:', result.error);
      }

      // Brief success feedback
      setTimeout(() => {
        setIsSaving(false);
        setShowLoadingProgress(false);
      }, 1500);
    } catch (error) {
      console.error('❌ Failed to save story:', error);
      setIsSaving(false);
      setShowLoadingProgress(false);
    }
  };

  const handleGenerateImages = async () => {
    setIsGeneratingImages(true);
    setLoadingTask('images');
    setShowLoadingProgress(true);

    try {
      const response = await fetch('http://localhost:8000/api/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: originalPrompt || storyText,
          age,
          language: currentLanguage.code
        })
      });

      const result = await response.json();

      if (result.success) {
        // Store story data and show viewer
        const newStoryData = {
          framesData: result.frames_data,
          imagePaths: result.image_paths
        };
        setStoryData(newStoryData);
        setShowStoryViewer(true);

        // Auto-save to DB after images generation
        await autoSaveStory(null, newStoryData);
      } else {
        alert(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      alert(`❌ Failed to generate images: ${error}`);
    } finally {
      setIsGeneratingImages(false);
      setShowLoadingProgress(false);
    }
  };

  const buttonSize = size === 'small'
    ? 'text-xs sm:text-sm px-2 sm:px-4 py-2 sm:py-3 min-h-[40px] sm:min-h-[48px]'
    : 'text-sm sm:text-base px-3 sm:px-6 py-3 sm:py-4 min-h-[48px] sm:min-h-[56px]';
  const iconSize = size === 'small' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl';

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <button
          onClick={handleListen}
          disabled={isGeneratingAudio || isGeneratingImages || isSaving}
          className={`${buttonSize} bg-gradient-to-r from-blue-100 to-blue-200 hover:from-blue-200 hover:to-blue-300 disabled:from-gray-100 disabled:to-gray-200 text-blue-700 hover:text-blue-800 disabled:text-gray-400 rounded-xl font-semibold shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 flex items-center gap-2 border border-blue-200 hover:border-blue-300`}
        >
          <span className={`${iconSize} ${isGeneratingAudio ? 'animate-spin' : ''}`}>
            {isGeneratingAudio ? '🎧' : showAudioPlayer ? '🙈' : ''}
          </span>
          <span>{isGeneratingAudio ? 'Generating...' : showAudioPlayer ? 'Hide Player' : t('listen')}</span>
        </button>

        <button
          onClick={handleGenerateImages}
          disabled={isGeneratingAudio || isGeneratingImages || isSaving}
          className={`${buttonSize} bg-gradient-to-r from-purple-100 to-pink-100 hover:from-purple-200 hover:to-pink-200 disabled:from-gray-100 disabled:to-gray-200 text-purple-700 hover:text-purple-800 disabled:text-gray-400 rounded-xl font-semibold shadow-md transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 flex items-center gap-2 border border-purple-200 hover:border-purple-300`}
        >
          <span className={`${iconSize} ${isGeneratingImages ? 'animate-spin' : ''}`}>
            {isGeneratingImages ? '✨' : ''}
          </span>
          <span>{isGeneratingImages ? 'Creating...' : t('images')}</span>
        </button>
      </div>

      {/* Audio Player */}
      {showAudioPlayer && generatedAudioUrl && (
        <KidAudioPlayer
          audioUrl={generatedAudioUrl}
          storyText={storyText}
          onClose={() => {
            setShowAudioPlayer(false);
            setGeneratedAudioUrl(null);
          }}
        />
      )}

      {/* Loading Progress */}
      <LoadingProgress
        isVisible={showLoadingProgress}
        task={loadingTask}
      />

      {/* Story Viewer */}
      {showStoryViewer && storyData && (
        <StoryViewer
          framesData={storyData.framesData}
          imagePaths={storyData.imagePaths}
          onClose={() => setShowStoryViewer(false)}
        />
      )}
    </div>
  );
};

export default StoryActions;
