import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

interface KidAudioPlayerProps {
  audioUrl?: string;
  storyText: string;
  onClose: () => void;
}

const KidAudioPlayer: React.FC<KidAudioPlayerProps> = ({ audioUrl, storyText, onClose }) => {
  const { currentLanguage, t } = useLanguage();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.8);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const currentAudioUrl = audioUrl || generatedAudioUrl;
    if (currentAudioUrl && audioRef.current) {
      const audio = audioRef.current;

      // Ensure we use the full URL for saved stories
      const fullAudioUrl = currentAudioUrl.startsWith('http')
        ? currentAudioUrl
        : `http://localhost:8000${currentAudioUrl}`;

      if (audio.src !== fullAudioUrl) {
        audio.src = fullAudioUrl;
        audio.load();
      }

      const updateTime = () => setCurrentTime(audio.currentTime);
      const updateDuration = () => setDuration(audio.duration);
      const handleEnded = () => setIsPlaying(false);

      audio.addEventListener('timeupdate', updateTime);
      audio.addEventListener('loadedmetadata', updateDuration);
      audio.addEventListener('ended', handleEnded);

      return () => {
        audio.removeEventListener('timeupdate', updateTime);
        audio.removeEventListener('loadedmetadata', updateDuration);
        audio.removeEventListener('ended', handleEnded);
      };
    }
  }, [audioUrl, generatedAudioUrl]);

  const generateAudio = async () => {
    console.log('🎤 Starting audio generation...', {
      language: currentLanguage.code,
      textLength: storyText.length,
      timestamp: new Date().toISOString()
    });

    setIsGeneratingAudio(true);

    console.log('🎤 Starting audio generation...', {
      language: currentLanguage.code,
      textLength: storyText.length,
      timestamp: new Date().toISOString(),
    });

    try {

      const response = await fetch('http://localhost:8000/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: storyText,
          language: currentLanguage.code,
          filename: `story_${Date.now()}`,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('✅ Audio generation completed successfully!', {
          audioPath: result.audio_path,
          message: result.message,
          timestamp: new Date().toISOString(),
        });

        const audioUrl = `http://localhost:8000/${result.audio_path}`;
        console.log('🎶 Setting audio URL:', audioUrl);

        setGeneratedAudioUrl(audioUrl);

        // Auto-play the generated audio
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.load();

          const playWhenReady = () => {
            console.log('▶️ Attempting auto-play...');
            audioRef.current
              ?.play()
              .then(() => console.log('🎉 Auto-play successful'))
              .catch((error) => {
                console.error('❌ Auto-play failed:', error);
                // Auto-play failed, user must click play manually
              });
          };

          // Try multiple events to ensure audio is ready
          audioRef.current.addEventListener('canplay', playWhenReady, { once: true });
          audioRef.current.addEventListener('loadeddata', playWhenReady, { once: true });
        }
      } else {
        console.error('❌ Audio generation failed:', result.error);
        alert(`❌ Failed to generate audio: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Audio generation error:', error);
      alert(`❌ Failed to generate audio: ${error}`);
    } finally {
      setIsGeneratingAudio(false);
      console.log('🛑 Audio generation process ended');
    }
  };



  const togglePlayPause = () => {
    const currentAudioUrl = audioUrl || generatedAudioUrl;
    console.log('🎵 Toggle play/pause - URL:', currentAudioUrl, 'Playing:', isPlaying);

    if (currentAudioUrl && audioRef.current) {
      // Use audio file (original or generated)
      if (isPlaying) {
        console.log('⏸️ Pausing audio');
        audioRef.current.pause();
      } else {
        console.log('▶️ Playing audio');

        // Ensure we use the full URL for saved stories
        const fullAudioUrl = currentAudioUrl.startsWith('http')
          ? currentAudioUrl
          : `http://localhost:8000${currentAudioUrl}`;

        if (audioRef.current.src !== fullAudioUrl) {
          audioRef.current.src = fullAudioUrl;
          audioRef.current.load();
        }

        audioRef.current
          .play()
          .then(() => console.log('🎉 Manual play successful'))
          .catch((error) => console.error('❌ Manual play failed:', error));
      }

      setIsPlaying(!isPlaying);
    } else {
      console.log('⚠️ No audio URL, generating audio first');
      generateAudio();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;



  return (
    <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-lg sm:rounded-2xl p-2 sm:p-4 shadow-lg border-2 border-blue-200 dark:border-blue-700 mt-3">
      <audio
        ref={audioRef}
        onPlay={() => {
          console.log('▶️ Audio playback started');
          setIsPlaying(true);
        }}
        onPause={() => {
          console.log('⏸️ Audio playback paused');
          setIsPlaying(false);
        }}
        onEnded={() => {
          console.log('🏁 Audio playback ended');
          setIsPlaying(false);
        }}
        onLoadStart={() => console.log('⏳ Audio loading started')}
        onCanPlay={() => console.log('✅ Audio ready to play')}
        onError={(e) => console.error('❌ Audio error:', e)}
        onLoadedData={() => console.log('🎶 Audio data loaded')}
        onLoadedMetadata={() => console.log('📊 Audio metadata loaded')}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <span className="text-lg">🎧</span>
        <span className="text-sm sm:text-base font-bold text-blue-700 dark:text-blue-300">
          {t('listeningToStory')}
        </span>
        <button
          onClick={onClose}
          className="w-6 h-6 sm:w-8 sm:h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all hover:scale-110 text-xs sm:text-base"
        >
          ✖
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-2 sm:mb-4">
        <div className="relative bg-gray-200 dark:bg-gray-600 rounded-full h-3 overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration}
            value={currentTime}
            onChange={handleSeek}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>

        <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1 px-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>



      {/* Controls */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-2 sm:mb-3">

        {/* Play/Pause */}
        <button
          onClick={togglePlayPause}
          disabled={isGeneratingAudio}
          className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 active:scale-95"
        >
          <span className="text-lg sm:text-xl">
            {isGeneratingAudio ? '⏳' : isPlaying ? '⏸️' : '▶️'}
          </span>
        </button>

        {/* Speed Controls */}
        <div className="flex gap-1 flex-wrap">
          {[0.6, 0.8, 1.0, 1.2].map((speed) => (
            <button
              key={speed}
              onClick={() => changeSpeed(speed)}
              className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium transition-all ${playbackRate === speed
                  ? 'bg-purple-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-purple-200'
                }`}
            >
              {speed === 0.6 ? '🏊' : speed === 0.8 ? '🚶' : '🏃'}
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-2">
        <span className="text-sm">🔊</span>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => {
            const newVolume = parseFloat(e.target.value);
            setVolume(newVolume);
            if (audioRef.current) {
              audioRef.current.volume = newVolume;
            }
          }}
          className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
        <span className="text-xs text-gray-600 dark:text-gray-400 w-8">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};

export default KidAudioPlayer;

