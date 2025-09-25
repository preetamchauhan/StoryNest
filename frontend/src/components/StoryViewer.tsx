import React, { useState, useCallback, useEffect } from "react";
import { Button } from "./ui/button";
import { useLanguage } from "../contexts/LanguageContext";

// Story themes definition
const storyThemes = [
  {
    id: "fantasy",
    emoji: "🧚‍♀️",
    colors: {
      background: "from-purple-100 to-pink-100",
      secondary: "from-purple-200 to-pink-200",
      text: "text-purple-800",
    },
  },
  {
    id: "adventure",
    emoji: "🗺️",
    colors: {
      background: "from-green-100 to-blue-100",
      secondary: "from-green-200 to-blue-200",
      text: "text-green-800",
    },
  },
  {
    id: "space",
    emoji: "🚀",
    colors: {
      background: "from-blue-100 to-indigo-100",
      secondary: "from-blue-200 to-indigo-200",
      text: "text-blue-800",
    },
  },
];

interface StoryPage {
  title: string;
  content: string;
  imagePath?: string;
  dialogue?: Array<{ speaker: string; line: string }>;
  isCover?: boolean;
  isBackCover?: boolean;
}

interface StoryViewerProps {
  framesData: Record<string, any>;
  imagePaths?: string[];
  onClose: () => void;
  theme?: string;
  storyTitle?: string;
}

const StoryViewer: React.FC<StoryViewerProps> = ({
  framesData,
  imagePaths,
  onClose,
  theme = "fantasy",
  storyTitle,
}) => {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [imagePopup, setImagePopup] = useState<string | null>(null);

  // Get theme colors
  const currentTheme =
    storyThemes.find((themeItem) => themeItem.id === theme) || storyThemes[0];

  // Convert frames data to story pages
  const StoryPages: StoryPage[] = Object.entries(framesData).map(
    ([frameKey, frameData]: [string, any]) => {
      const frame = frameData.frame_data;
      const scenes = frameData.scenes || [];
      let imagePath = frameData.image_path || "";
      if (imagePaths && imagePaths.length > 0) {
        const frameIndex = parseInt(frameKey.replace("frame_", "")) - 1;
        if (frameIndex >= 0 && frameIndex < imagePaths.length) {
          imagePath = imagePaths[frameIndex];
        }
      }
      return {
        title: frame.title || "",
        content: scenes[0]?.action || frame.objective || "",
        imagePath,
        dialogue: scenes[0]?.dialogue || [],
      };
    }
  );

  // Add cover and back pages
  const allPages: any[] = [
    {
      title: storyTitle || "Story Adventure",
      content: "A Magical Tale.",
      imagePath: "",
      dialogue: [],
      isCover: true,
    },
    ...StoryPages,
    {
      title: "The End",
      content: "Thank you for reading!",
      imagePath: "",
      dialogue: [],
      isBackCover: true,
    },
  ];

  const totalPages = allPages.length;

  const nextPage = useCallback(() => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages]);

  const prevPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage]);

  // Auto-play functionality
  useEffect(() => {
    if (isAutoPlay && currentPage < totalPages - 1) {
      const timer = setTimeout(() => {
        nextPage();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isAutoPlay, currentPage, totalPages, nextPage]);

  // Render page
  const renderPage = (page: any, index: number) => {
    if (page.isCover) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 flex flex-col items-center justify-center text-white rounded-lg">
          <div className="text-4xl md:text-6xl mb-4">✨</div>
          <h1 className="text-2xl md:text-4xl font-bold text-center mb-4">
            {page.title}
          </h1>
          <p className="text-lg md:text-xl text-center opacity-90">
            {page.content}
          </p>
        </div>
      );
    }

    if (page.isBackCover) {
      return (
        <div className="w-full h-full bg-gradient-to-br from-green-400 via-blue-400 to-purple-400 flex flex-col items-center justify-center text-white rounded-lg">
          <div className="text-4xl md:text-6xl mb-4">🌟</div>
          <h2 className="text-2xl md:text-4xl font-bold text-center mb-4">
            {page.title}
          </h2>
          <p className="text-center opacity-90 md:text-lg">{page.content}</p>
          <p className="text-sm opacity-75 text-center">
            Created with Magic ✨
          </p>
        </div>
      );
    }

    return (
      <div className="w-full h-full bg-white rounded-lg p-2 md:p-3 lg:p-4 pt-1 md:pt-2 lg:pt-3 flex flex-col">
        {/* Page Header */}
        <div className="mb-2 md:mb-3">
          <h3
            className={`text-base md:text-lg lg:text-xl font-bold ${currentTheme.colors.text} mb-1 md:mb-2`}
          >
            {page.title}
          </h3>
          <div className="w-full h-2 bg-gradient-to-r from-purple-300 to-pink-300 rounded"></div>
        </div>

        {/* Image Section */}
        {page.imagePath && (
          <div className="mb-4 md:mb-6 flex-shrink-0">
            <div
              className={`w-full h-96 md:h-129 lg:h-144 bg-gradient-to-br ${currentTheme.colors.secondary
                } rounded-lg flex items-center justify-center border-2 ${currentTheme.colors.text.replace(
                  "text-",
                  "border-"
                )}`}
            >
              <img
                src={
                  page.imagePath.startsWith("http")
                    ? page.imagePath
                    : `http://localhost:8000${page.imagePath}`
                }
                alt="Story Image"
                className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() =>
                  setImagePopup(
                    page.imagePath.startsWith("http")
                      ? page.imagePath
                      : `http://localhost:8000${page.imagePath}`
                  )
                }
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  target.parentElement!.innerHTML = `
                    <div class="text-4xl md:text-6xl text-purple-300">🚫</div>
                    <p class="text-purple-500 mt-2 text-sm">${page.title}</p>
                  `;
                }}
              />
            </div>
          </div>
        )}

        {/* Story Content */}
        <div className="flex-1 overflow-y-auto">
          <p className="text-gray-700 leading-relaxed mb-4 text-xs md:text-sm lg:text-base">
            {page.content}
          </p>

          {/* Dialogue */}
          {page.dialogue && page.dialogue.length > 0 && (
            <div className="space-y-2 mt-4">
              <h4 className="text-sm font-semibold text-purple-600 mb-2">💬 Dialogue:</h4>
              {page.dialogue.map((dialog: any, dialogIndex: number) => (
                <div
                  key={dialogIndex}
                  className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg shadow-sm"
                >
                  <p className="text-sm md:text-base">
                    <span className="font-bold text-purple-700">{dialog.speaker}:</span>
                    <span className="ml-2 text-gray-800 italic">"{dialog.line}"</span>
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full h-full max-w-4xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div
          className={`flex justify-between items-center p-4 border-b bg-gradient-to-r ${currentTheme.colors.secondary} rounded-t-lg flex-shrink-0`}
        >
          <h2
            className={`text-lg md:text-2xl font-bold ${currentTheme.colors.text}`}
          >
            {currentTheme.emoji} {t("storyBook")}
          </h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsAutoPlay(!isAutoPlay)}
              variant="outline"
              size="sm"
              className={`text-xs md:text-sm ${isAutoPlay ? "bg-green-100 text-green-700" : ""
                }`}
            >
              <span className="md:hidden">{isAutoPlay ? "⏸" : "▶️"}</span>
              <span className="hidden md:inline">
                {isAutoPlay ? "Pause" : "Auto Play"}
              </span>
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
              className="text-xs md:text-sm"
            >
              <span className="md:hidden">✖</span>
              <span className="hidden md:inline">✖ Close</span>
            </Button>
          </div>
        </div>

        {/* Story Container */}
        <div
          className={`flex-1 bg-gradient-to-br ${currentTheme.colors.background} p-4 overflow-hidden`}
        >
          <div className="h-full w-full max-w-2xl mx-auto">
            {renderPage(allPages[currentPage], currentPage)}
          </div>
        </div>

        {/* Navigation Controls */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-b-lg flex-shrink-0">
          <Button
            onClick={prevPage}
            disabled={currentPage === 0}
            variant="outline"
            size="sm"
            className="text-xs md:text-sm"
          >
            <span className="md:hidden">◀</span>
            <span className="hidden md:inline">Previous</span>
          </Button>
          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4">
            <span className="text-xs md:text-sm text-gray-600">
              {currentPage + 1} / {totalPages}
            </span>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 8) }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i)}
                  className={`w-2 h-2 md:w-3 md:h-3 rounded-full transition-colors ${currentPage === i ? "bg-purple-500" : "bg-gray-300"
                    }`}
                />
              ))}
            </div>
          </div>
          <Button
            onClick={nextPage}
            disabled={currentPage >= totalPages - 1}
            variant="outline"
            size="sm"
            className="text-xs md:text-sm"
          >
            <span className="md:hidden">▶</span>
            <span className="hidden md:inline">Next</span>
          </Button>
        </div>
      </div>

      {/* Image Popup */}
      {imagePopup && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setImagePopup(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh] w-full flex items-center justify-center">
            <img
              src={
                imagePopup.startsWith("http")
                  ? imagePopup
                  : `http://localhost:8000${imagePopup}`
              }
              alt="Story Image"
              className="w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setImagePopup(null)}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-70 transition-all"
            >
              ✖
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoryViewer;
