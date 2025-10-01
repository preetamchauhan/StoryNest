import React, { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { useApp } from "../contexts/AppContext";
import { useStream } from "../hooks/useStreams";
import ChatInterface from "./ChatInterface";
import { useLanguage } from "../contexts/LanguageContext";

const FreeformStory: React.FC = () => {
  const { age } = useApp();
  const { t, currentLanguage, setIsLanguageSelectionDisabled } = useLanguage();
  const { events, isStreaming, startStream, clearEvents } = useStream();
  const [showChat, setShowChat] = useState(false);
  const [prompt, setPrompt] = useState("");

  // Disable language selection when component mounts
  React.useEffect(() => {
    setIsLanguageSelectionDisabled(true);
    return () => setIsLanguageSelectionDisabled(false); // Re-enable on unmount
  }, [setIsLanguageSelectionDisabled]);

  const generateStory = () => {
    clearEvents();
    setShowChat(true);

    const request = {
      mode: "freeform" as const,
      prompt,
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
        mode="freeform"
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 mt-2 flex-1">
      <Card
        className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/20 
        dark:to-pink-900/20 border-none shadow-xl"
      >
        <CardHeader className="text-center py-4">
          <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
            <span className="text-3xl">✨</span>
            <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              My Own Idea
            </span>
          </CardTitle>
          <p className="text-base text-muted-foreground mt-1">
            Tell us your story idea and we’ll make it magical!
          </p>
        </CardHeader>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            💭 {t("tellUsIdea")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Once upon a time... What kind of story do you want to create?"
            className="w-full h-32 p-4 border rounded-lg resize-none focus:ring-2 focus:ring-purple-400 
      focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white 
      placeholder-gray-500 dark:placeholder-gray-400"
          />
        </CardContent>
      </Card>

      <div className="text-center">
        <Button
          onClick={generateStory}
          disabled={isStreaming || !prompt.trim()}
          variant="kid"
          size="lg"
          className="animate-bounce-gentle hover:animate-none"
        >
          {isStreaming ? (
            <>
              <span className="animate-spin mr-2">🌟</span>
              Creating Your Story...
            </>
          ) : (
            <>🚀 {t("generateStory")}</>
          )}
        </Button>
      </div>
    </div>
  );
};

export default FreeformStory;
