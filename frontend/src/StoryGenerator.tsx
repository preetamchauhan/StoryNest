import React, { useState } from 'react';
import StoryModeSelector from './components/StoryModeSelector';
import SurpriseStory from './components/SurpriseStory';
import GuidedStory from './components/GuidedStory';
import FreeFormStory from './components/FreeformStory';

const StoryGenerator: React.FC = () => {
  const [currentMode, setCurrentMode] = useState<'selector' | 'surprise' | 'guided' | 'freeform'>('selector');

  const handleModeSelect = (mode: 'surprise' | 'guided' | 'freeform') => {
    setCurrentMode(mode);
  };

  const handleBackToSelector = () => {
    setCurrentMode('selector');
  };

  if (currentMode === 'selector') {
    return <StoryModeSelector onModeSelect={handleModeSelect} />;
  }

  if (currentMode === 'surprise') {
    return <SurpriseStory />;
  }

  if (currentMode === 'guided') {
    return <GuidedStory />;
  }

  if (currentMode === 'freeform') {
    return <FreeFormStory />;
  }

  return null;
};

export default StoryGenerator;
