import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import StoryViewer from '../components/StoryViewer';
import KidAudioPlayer from '../components/KidAudioPlayer';
import StoryTextViewer from '../components/StoryTextViewer';
import { getStories, searchStories, deleteStory as apiDeleteStory, apiRequest } from '../lib/api';

interface SavedStory {
  id: string;
  title: string;
  text: string;
  language: string;
  age: number;
  audioUrl?: string;
  createdAt: string;
  framesData?: any;
  imagePaths?: string[];
}

const MyStoriesPage: React.FC = () => {
  const t = useLanguage();
  const navigate = useNavigate();
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [selectedStory, setSelectedStory] = useState<SavedStory | null>(null);
  const [showStoryViewer, setShowStoryViewer] = useState(false);
  const [showAudioPlayer, setShowAudioPlayer] = useState(false);
  const [audioStory, setAudioStory] = useState<SavedStory | null>(null);
  const [showTextViewer, setShowTextViewer] = useState(false);
  const [textStory, setTextStory] = useState<SavedStory | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalStories, setTotalStories] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const storiesPerPage = 9;

  useEffect(() => {
    loadSavedStories();
  }, []);

  // Throttle search with 1 second delay
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchQuery);
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const loadSavedStories = async (page: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      const offset = (page - 1) * storiesPerPage;
      const result = await getStories(offset, storiesPerPage);

      if (result.success) {
        const total = parseInt(result.message.split(':')[1] || '0');
        setTotalStories(total);
        setHasMore(offset + result.stories.length < total);

        // Debug: Log story data to see what’s loaded
        console.log('Loaded stories:', result.stories.map((s: any) => ({
          id: s.id,
          title: s.title,
          audioUrl: s.audioUrl,
          hasAudio: !!s.audioUrl,
          hasFramesData: !!s.framesData,
          hasImagePaths: !!s.imagePaths,
          rawStory: s,
        })));

        if (append) {
          setSavedStories(prev => [...prev, ...result.stories]);
        } else {
          setSavedStories(result.stories);
        }
      } else {
        console.error('Failed to load stories:', result.error);
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteStory = async (storyId: string) => {
    try {
      const result = await apiDeleteStory(storyId);
      if (result.success) {
        setSavedStories(savedStories.filter(story => story.id !== storyId));
      } else {
        alert(`Failed to delete story: ${result.error}`);
      }
    } catch (error) {
      alert(`Failed to delete story: ${error}`);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setCurrentPage(1);
      loadSavedStories(1);
      return;
    }

    setIsSearching(true);
    try {
      const result = await searchStories(query.trim(), 20);
      if (result.success) {
        setSavedStories(result.stories);
      } else {
        console.error('Search failed:', result.error);
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInput = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const loadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadSavedStories(nextPage, true);
  };

  const openStoryViewer = (story: SavedStory) => {
    setSelectedStory(story);
    setShowStoryViewer(true);
  };

  const openTextViewer = (story: SavedStory) => {
    setTextStory(story);
    setShowTextViewer(true);
  };

  const openAudioPlayer = (story: SavedStory) => {
    setAudioStory(story);
    setShowAudioPlayer(true);
  };

  const closeAudioPlayer = () => {
    setShowAudioPlayer(false);
    setAudioStory(null);
  };

  const closeTextViewer = () => {
    setShowTextViewer(false);
    setTextStory(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getLanguageFlag = (langCode: string) => {
    const flags: Record<string, string> = {
      'hi': '🇮🇳', 'en': 'us', 'es': '🇪🇸',
      'fr': '🇫🇷', 'de': '🇩🇪',
      'ja': '🇯🇵', 'ko': '🇰🇷', 'ar': '🇸🇦',
    };
    return flags[langCode] || '🌐';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
              <div className='flex items-center gap-2 sm:gap-3'>
                <button
                  onClick={async () => {
                    try {
                      await apiRequest('/api/clear-sessions', { method: 'POST' });
                    } catch (error) {
                      console.error('Failed to clear server sessions:', error);
                    }
                    navigate('/');
                  }}
                  className="text-purple-600 hover:text-purple-800 text-xl sm:text-2xl"
                >
                  ←
                </button>
                <h1 className='text-lg sm:text-2xl md:text-3xl font-bold text-purple-700 dark:text-purple-300'>
                  📚 My Stories</h1>
              </div>
              <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 ml-8 sm:ml-0">
                {searchQuery ? `${savedStories.length} results` : `${savedStories.length} of ${totalStories} stories`}
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search stories..."
                value={searchQuery}
                onChange={(e) => handleSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm sm:text-base"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                {isSearching ? '🔄' : '🔎'}
              </div>
              {searchQuery && (
                <button
                  onClick={() => handleSearchInput('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">📚</div>
              <div className="text-xl font-semibold text-purple-600 mb-2">Loading your Stories...</div>
              <div className="text-gray-500">Please wait while we fetch your magical tales</div>
            </div>
          </div>
        ) : savedStories.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-8xl mb-6">📚</div>s
            <h2 className="text-2xl font-semibold text-gray-600 dark:text-gray-400 mb-4">No stories yet</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first story to see it here!</p>
            <button
              onClick={async () => {
                try {
                  await apiRequest('/api/clear-sessions', { method: 'POST' });
                } catch (error) {
                  console.error('Failed to clear server sessions:', error);
                }
                navigate('/');
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold transition-all"
            >
              Create Story
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {savedStories.map((story) => (
              <div
                key={story.id}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 border border-purple-100 dark:border-gray-700"
              >
                {/* Story Header */}
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold text-purple-700 dark:text-purple-300 text-base sm:text-lg line-clamp-2 flex-1">{story.title}</h3>
                  <button
                    onClick={() => deleteStory(story.id)}
                    className="text-red-500 hover:text-red-700 ml-2 text-lg hover:scale-110 transition-all"
                  >
                    🗑️
                  </button>
                </div>

                {/* Story Info */}
                <div className="flex items-center gap-2 mb-4 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-lg">{getLanguageFlag(story.language)}</span>
                  <span>Age {story.age}</span>
                  <span>•</span>
                  <span>{formatDate(story.createdAt)}</span>
                </div>

                {/* Story Preview */}
                <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-4 mb-4 leading-relaxed">
                  {story.text.substring(0, 150)}...
                </p>

                {/* Actions */}
                <div className="flex gap-1 sm:gap-2">
                  {/* Always show story button */}
                  <button
                    onClick={() => openTextViewer(story)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs sm:text-sm py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg transition-all font-medium"
                  >
                    📖 Story
                  </button>

                  {/* Show Listen button only if audio exists */}
                  {story.audioUrl && (
                    <button
                      onClick={() => openAudioPlayer(story)}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 text-white text-xs sm:text-sm py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg transition-all font-medium"
                    >
                      🎧 Listen
                    </button>
                  )}

                  {/* Show Read button only if images exist */}
                  {story.framesData && story.imagePaths && story.imagePaths.length > 0 && (
                    <button
                      onClick={() => openStoryViewer(story)}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 text-white text-xs sm:text-sm py-2 sm:py-2.5 px-2 sm:px-3 rounded-lg transition-all font-medium"
                    >
                      📚 Story Book
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More Button */}
        {!searchQuery && hasMore && (
          <div className="text-center mt-6 sm:mt-8 px-4">
            <button
              onClick={loadMore}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg font-semibold transition-all hover:scale-105 text-sm sm:text-base w-full sm:w-auto max-w-xs"
            >
              Load More Stories
            </button>
          </div>
        )}
      </div>

      {/* Audio Player */}
      {showAudioPlayer && audioStory && (
        <div className="fixed bottom-4 left-4 right-4 z-50">
          <KidAudioPlayer
            audioUrl={audioStory.audioUrl}
            storyText={audioStory.text}
            onClose={closeAudioPlayer}
          />
        </div>
      )}

      {/* Text Story Viewer */}
      {showTextViewer && textStory && (
        <StoryTextViewer
          title={textStory.title}
          text={textStory.text}
          onClose={closeTextViewer}
        />
      )}

      {/* Image Story Viewer */}
      {showStoryViewer && selectedStory && (
        <StoryViewer
          framesData={selectedStory.framesData || {}}
          imagePaths={selectedStory.imagePaths || []}
          onClose={() => setShowStoryViewer(false)}
          storyTitle={selectedStory.title}
        />
      )}
    </div>
  );
};

export default MyStoriesPage;
