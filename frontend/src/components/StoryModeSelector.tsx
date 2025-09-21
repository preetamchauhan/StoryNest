import React from 'react';
import { Card, CardHeader, CardTitle } from './ui/card';
import { useLanguage } from '../contexts/LanguageContext';

interface StoryModeSelector {
  onModeSelect: (mode: 'surprise' | 'guided' | 'freeform') => void;
}

const StoryModeSelector: React.FC<StoryModeSelector> = ({ onModeSelect }) => {
  const { t } = useLanguage();

  const modeOptions = [
    { value: 'surprise', icon: '✨', label: t('surpriseMe'), desc: 'Let AI create a magical story for you' },
    { value: 'guided', icon: '🗺️', label: t('guidedStory'), desc: 'Choose your adventure step by step' },
    { value: 'freeform', icon: '✍️', label: t('myOwnIdea'), desc: 'Tell us your story idea' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-2 flex-1">
      {/* Welcome Section */}
      <Card className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-none shadow-xl">
        <CardHeader className="text-center py-4">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
            ✨ Create Your Magical Story ✨
          </CardTitle>
          <p className="text-base text-muted-foreground mt-1">
            Choose how you’d like to start your amazing adventure!
          </p>
        </CardHeader>
      </Card>

      {/* Mode Selection */}
      <div className="grid md:grid-cols-3 gap-6">
        {modeOptions.map((option) => (
          <Card
            key={option.value}
            className="cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg"
            onClick={() => onModeSelect(option.value as any)}
          >
            <CardHeader className="text-center">
              <CardTitle className="text-xl flex items-center justify-center gap-2">
                <span>{option.icon}</span> <span>{option.label}</span>
              </CardTitle>
              <p className="text-sm text-muted-foreground">{option.desc}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default StoryModeSelector;
