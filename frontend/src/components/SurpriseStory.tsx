import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useApp } from "../contexts/AppContext";
import { useStream } from "../hooks/useStreams";
import ChatInterface from "./ChatInterface";
import { useLanguage } from "../contexts/LanguageContext";

const SurpriseStory: React.FC = () => {
  const { age } = useApp();
  const { t, currentLanguage, setIsLanguageSelectionDisabled } = useLanguage();
  const { events, isStreaming, startStream, clearEvents } = useStream();
  const [showChat, setShowChat] = useState(false);

  // Disable language selection when component mounts
  React.useEffect(() => {
    setIsLanguageSelectionDisabled(true);
    return () => setIsLanguageSelectionDisabled(false); // Re-enable on unmount
  }, [setIsLanguageSelectionDisabled]);

  const generateStory = () => {
    clearEvents();
    setShowChat(true);

    const request = {
      mode: "surprise" as const,
      age,
      language: currentLanguage.code,
      story_data: {},
    };

    startStream(request);
  };

  const resetToMenu = () => {
    setShowChat(false);
    clearEvents();
  };

  if (showChat) {
    return (
      <ChatInterface
        events={events}
        isStreaming={isStreaming}
        onBack={resetToMenu}
        mode="surprise"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-2 flex-1">
      <Card className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 border-none shadow-xl">
        <CardHeader className="text-center py-4">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <span className="text-3xl">✨</span>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Surprise Me!
            </span>
          </CardTitle>
          <p className="text-base text-muted-foreground mt-1">
            {t("letAiCreate")}
          </p>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardContent className="text-center py-8">
          <div className="space-y-4">
            <div className="text-6xl">⭐</div>
            <h3 className="text-2xl font-semibold">{t("readyForAdventure")}</h3>
            <p className="text-muted-foreground">{t("clickButtonBelow")}</p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center">
        <Button
          onClick={generateStory}
          disabled={isStreaming}
          variant="kid"
          size="kid"
          className="animate-bounce-gentle hover:animate-none"
        >
          {isStreaming ? (
            <>
              <span className="animate-spin mr-2">🌟</span>
              Creating Your Story...
            </>
          ) : (
            <> 🚀 {t("generateStory")}</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default SurpriseStory;
