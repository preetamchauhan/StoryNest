import React, { useState, useEffect } from 'react';

interface LoadingProgressProps {
  isVisible: boolean;
  task: 'story' | 'images' | 'audio';
  progress?: number;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({ isVisible, task, progress = 0 }) => {
  const [currentProgress, setCurrentProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);

  const taskConfig = {
    story: {
      title: 'Saving Your Story',
      emoji: '📖',
      steps: [
        'Preparing story data...',
        'Saving to database...',
        'Updating story index...',
        'Finalizing save...'
      ],
      estimatedTime: '5-10 seconds'
    },
    images: {
      title: 'Generating Story Images',
      emoji: '🎨',
      steps: [
        'Preparing image prompts...',
        'Generating illustrations...',
        'Processing artwork...',
        'Creating story frames...',
        'Finalizing visuals...'
      ],
      estimatedTime: '2-3 minutes'
    },
    audio: {
      title: 'Creating Audio Narration',
      emoji: '🎵',
      steps: [
        'Preparing text for speech...',
        'Selecting voice settings...',
        'Generating audio...',
        'Processing narration...',
        'Finalizing audio file...'
      ],
      estimatedTime: '15-30 seconds'
    }
  };

  const config = taskConfig[task];

  useEffect(() => {
    if (!isVisible) {
      setCurrentProgress(0);
      setCurrentStep(0);
      return;
    }


      const interval = setInterval(() => {
    setCurrentProgress(prev => {
      const newProgress = Math.min(prev + Math.random() * 3, 95);

      // Update step index based on progress
      const stepIndex = Math.floor((newProgress / 100) * config.steps.length);
      setCurrentStep(Math.min(stepIndex, config.steps.length - 1));

      return newProgress;
    });
  }, 500);

  return () => clearInterval(interval);
}, [isVisible, config.steps.length]);

if (!isVisible) return null;

return (
  <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-4xl mb-2 animate-bounce">{config.emoji}</div>
        <h2 className="text-xl font-bold text-gray-800 mb-1">{config.title}</h2>
        <p className="text-sm text-gray-600">Estimated time: {config.estimatedTime}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Progress</span>
          <span>{Math.round(currentProgress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div
            className="w-full bg-gradient-to-r from-blue-400 to-purple-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${currentProgress}%` }}
          />
        </div>
      </div>

      {/* Current Step */}
      <div className="text-center">
        <div className="text-sm font-medium text-gray-700 mb-2">
          Step {currentStep + 1} of {config.steps.length}
        </div>
        <div className="text-sm text-gray-600 animate-pulse">
          {config.steps[currentStep]}
        </div>
      </div>

      {/* Animation Dots */}
      <div className="flex justify-center mt-4 space-x-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  </div>
);
};

export default LoadingProgress;

