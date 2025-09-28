import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useApp } from '../contexts/AppContext';
import { useStream } from '../hooks/useStreams';
import ChatInterface from './ChatInterface';
import { useLanguage } from '../contexts/LanguageContext';

const GuidedStory: React.FC = () => {
  const { age } = useApp();
  const { t, currentLanguage, setIsLanguageSelectionDisabled } = useLanguage();
  const { events, isStreaming, startStream, clearEvents } = useStream();
  const [showChat, setShowChat] = useState(false);

  // Disable language selection when component mounts
  React.useEffect(() => {
    setIsLanguageSelectionDisabled(true);
    return () => setIsLanguageSelectionDisabled(false); // Re-enable on unmount
  }, [setIsLanguageSelectionDisabled]);

  const [guidedData, setGuidedData] = useState({
    theme: '',
    character: '',
    companion: '',
    setting: '',
    challenge: '',
    tone: '',
    values: [] as string[]
  });

  const generateStory = () => {
    clearEvents();
    setShowChat(true);

    const ageGroup = age <= 7 ? "6-7" : age <= 9 ? "8-9" : "10-12";

    const storyData = {
      theme: guidedData.theme,
      character: guidedData.character,
      companion: guidedData.companion,
      setting: guidedData.setting,
      challenge: guidedData.challenge.toLowerCase(),
      tone: guidedData.tone,
      values: guidedData.values,
      age_group: ageGroup,
      language: currentLanguage.code,
    };

    const finalPrompt = `A ${guidedData.character} and ${guidedData.companion} in ${guidedData.setting}, facing a ${guidedData.challenge}, with a ${guidedData.tone} tone, focusing on ${guidedData.values.join(", ")}.`;

    const request = {
      model: 'guided' as const,
      prompt: finalPrompt,
      age,
      language: currentLanguage.code,
      story_data: storyData
    };

    startStream(request);
  };

  const resetToMenu = () => {
  setShowChat(false);
  clearEvents();
};

const isFormValid = guidedData.theme && guidedData.character && guidedData.setting;

if (showChat) {
  return <ChatInterface events={events} isStreaming={isStreaming} onBack={resetToMenu} mode="guided" />;
}

return (
  <div className="max-w-4xl mx-auto space-y-6 mt-2 flex-1 overflow-y-auto pb-6">
    <Card className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-none shadow-xl">
      <CardHeader className="text-center py-4">
        <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
          <span className="text-3xl">🗺️</span>
          <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Guided Story</span>
        </CardTitle>
        <p className="text-base text-muted-foreground mt-1">
          {t('chooseAdventure')}
        </p>
      </CardHeader>
    </Card>

    {/* Theme Selection */}
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          🎨 {t('chooseTheme')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            "Adventure", "Mystery", "Fantasy & Magic", "Science & Space", "Nature & Animals",
            "Friendship & Feelings", "School Life", "Celebrations & Culture", "Sports & Games", "Gentle Spooky"
          ].map((theme) => (
            <button
              key={theme}
              onClick={() => setGuidedData({ ...guidedData, theme })}
              className={`p-3 text-left rounded-lg border-2 transition-all ${
                guidedData.theme === theme
                  ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 hover:border-purple-200'
              }`}
            >
              {theme}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>

{/* Character & Setting */}
<div className="grid md:grid-cols-2 gap-6">
  <Card className="shadow-lg">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        🧑 {t('mainCharacter')}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <input
        value={guidedData.character}
        onChange={(e) => setGuidedData({ ...guidedData, character: e.target.value })}
        placeholder="e.g., curious rabbit, brave girl"
        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 
        text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
      />
    </CardContent>
  </Card>

  <Card className="shadow-lg">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        🐾 {t('companion')}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <input
        value={guidedData.companion}
        onChange={(e) => setGuidedData({ ...guidedData, companion: e.target.value })}
        placeholder="e.g., friendly robot, wise owl"
        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 
        text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
      />
    </CardContent>
  </Card>
</div>

{/* Setting */}
<Card className="shadow-lg">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      🏰 {t('setting')}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <input
      value={guidedData.setting}
      onChange={(e) => setGuidedData({ ...guidedData, setting: e.target.value })}
      placeholder="e.g., forest, castle, school"
      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 
      text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
    />
  </CardContent>
</Card>

{/* Character & Setting */}
<div className="grid md:grid-cols-2 gap-6">
  <Card className="shadow-lg">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        🧑 {t('mainCharacter')}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <input
        value={guidedData.character}
        onChange={(e) => setGuidedData({ ...guidedData, character: e.target.value })}
        placeholder="e.g., curious rabbit, brave girl"
        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 
        text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
      />
    </CardContent>
  </Card>

  <Card className="shadow-lg">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        🐾 {t('companion')}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <input
        value={guidedData.companion}
        onChange={(e) => setGuidedData({ ...guidedData, companion: e.target.value })}
        placeholder="e.g., friendly robot, wise owl"
        className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 
        text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
      />
    </CardContent>
  </Card>
</div>

{/* Setting */}
<Card className="shadow-lg">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      🏰 {t('setting')}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <input
      value={guidedData.setting}
      onChange={(e) => setGuidedData({ ...guidedData, setting: e.target.value })}
      placeholder="e.g., forest, castle, school"
      className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-purple-400 bg-white dark:bg-gray-800 
      text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
    />
  </CardContent>
</Card>


<div className="grid md:grid-cols-2 gap-6">
  <Card className="shadow-lg">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        ✨ {t('challenge')}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {[
          "Puzzle to solve", "Misunderstanding", "Creative project", "Time pressure",
          "Nature challenge", "Treasure/goal", "Silly obstacle"
        ].map((challenge) => (
          <button
            key={challenge}
            onClick={() => setGuidedData({ ...guidedData, challenge })}
            className={`w-full p-2 text-left rounded border transition-all ${
              guidedData.challenge === challenge
                ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 hover:border-purple-200'
            }`}
          >
            {challenge}
          </button>
        ))}
      </div>
    </CardContent>
  </Card>

  <Card className="shadow-lg">
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        🎭 {t('tone')}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {["silly", "adventurous", "gentle", "mysterious", "playful", "heartwarming"]
          .map((tone) => (
          <button
            key={tone}
            onClick={() => setGuidedData({ ...guidedData, tone })}
            className={`w-full p-2 text-left rounded border transition-all ${
              guidedData.tone === tone
                ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
                : 'border-gray-200 hover:border-purple-200'
            }`}
          >
            {tone}
          </button>
        ))}
      </div>
    </CardContent>
  </Card>
</div>


<Card className="shadow-lg">
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      ❤️ {t('values')}
    </CardTitle>
  </CardHeader>
  <CardContent>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {[
        "kindness", "courage", "friendship", "honesty", "teamwork", 
        "creativity", "perseverance"
      ].map((value) => (
        <button
          key={value}
          onClick={() => {
            const values = guidedData.values.includes(value)
              ? guidedData.values.filter(v => v !== value)
              : [...guidedData.values, value];
            setGuidedData({ ...guidedData, values });
          }}
          className={`p-2 text-sm rounded border transition-all ${
            guidedData.values.includes(value)
              ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
              : 'border-gray-200 hover:border-purple-200'
          }`}
        >
          {value}
        </button>
      ))}
    </div>
  </CardContent>
</Card>

<div className="text-center">
  <Button
    onClick={generateStory}
    disabled={isStreaming || !isFormValid}
    variant="kid"
    size="kid"
    className="animate-bounce-gentle hover:animate-none"
  >
    {isStreaming ? (
      <span>
        <span className="animate-spin mr-2">🌟</span>
        Creating Your Story...
      </span>
    ) : (
     <>🚀 {t('generateStory')}</>
    )}
  </Button>
</div>
</div>
  );
};

export default GuidedStory;

