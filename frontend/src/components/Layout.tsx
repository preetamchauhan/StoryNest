import React from 'react';
import { Button } from './ui/button';
import { useApp } from '../contexts/AppContext';
import { useLanguage } from '../contexts/LanguageContext';
import LanguageSelector from './LanguageSelector';
import MyStoriesButton from './MyStoriesButton';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isDark, setIsDark, age, setAge } = useApp();
  const { t } = useLanguage();

  const handleHomeClick = async () => {
    try {
      // Clear server-side sessions
      await fetch('http://localhost:8000/api/clear-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Failed to clear server sessions:', error);
    }

    // Clear client-side sessions
    sessionStorage.clear();
    localStorage.removeItem('currentStory');
    localStorage.removeItem('storySession');
    localStorage.removeItem('audioSession');
    localStorage.removeItem('imageSession');

    // Reset to home page
    window.location.href = '/home';
  };

  React.useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);


    return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-pink-900 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-blue-500/10 backdrop-blur-md border-b border-purple-200/20">
        <div className="container flex h-16 sm:h-20 items-center justify-between px-2 sm:px-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src="/storynest.png"
                alt="Story Nest"
                className="h-10 w-10 sm:h-16 sm:w-16 drop-shadow-lg"
              />
              <div className="absolute top-1 right-1 w-3 h-3 sm:w-4 sm:h-4 bg-yellow-400 rounded-full animate-pulse shadow-md"></div>
            </div>
            <div className="cursor-pointer group" onClick={handleHomeClick}>
              <h1 className="text-xl sm:text-3xl font-extrabold text-purple-600 bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent drop-shadow-sm group-hover:scale-105 transition-transform duration-200 leading-tight">
                {t('storyNest')}
              </h1>
              <p className="text-xs sm:text-sm bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 bg-clip-text text-transparent font-semibold tracking-wide group-hover:from-pink-500 group-hover:to-blue-500 transition-all duration-300 hidden sm:block">
                Where imagination comes alive ✨
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <LanguageSelector />
            <MyStoriesButton />
            <div className="flex items-center space-x-1">
              <span className="hidden sm:inline text-xs font-medium text-orange-700 dark:text-orange-300 mr-1">👶</span>
              <div className="flex space-x-1">
                <button
                  onClick={() => setAge(6)}
                  className={`px-1 sm:px-2 py-1 text-xs font-bold rounded-full transition-all duration-200 ${
                    age === 6
                      ? 'bg-gradient-to-r from-green-400 to-blue-400 text-white shadow-md transform scale-105'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  6
                </button>
                <span className="hidden sm:inline">·</span>
                <button
                  onClick={() => setAge(8)}
                  className={`px-1 sm:px-2 py-1 text-xs font-bold rounded-full transition-all duration-200 ${
                    age === 8
                      ? 'bg-gradient-to-r from-purple-400 to-pink-400 text-white shadow-md transform scale-105'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                 

                <span className="hidden sm:inline">👦</span>8-9
              </button>
              <button
                onClick={() => setAge(10)}
                className={`px-1 sm:px-2 py-1 text-xs font-bold rounded-full transition-all duration-200 ${
                  age === 10
                    ? 'bg-gradient-to-r from-orange-400 to-red-400 text-white shadow-md transform scale-105'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                <span className="hidden sm:inline">👨</span>10-12
              </button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="animate-wiggle hover:animate-none bg-gradient-to-r from-yellow-100 to-blue-100 dark:from-gray-700 dark:to-gray-600 hover:scale-110 transition-transform"
          >
            {isDark ? '🌙' : '☀️'}
          </Button>
        </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-1 sm:py-2 flex-1 min-h-0 flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 dark:from-gray-800 dark:via-purple-900/20 dark:to-pink-900/20 mt-auto">
        <div className="container py-3">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-2 lg:space-y-0 lg:space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl">📚</span>
              <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Made with ❤️ for young storytellers
              </p>
              <p className="text-xs text-muted-foreground">
                Safe • Fun • Educational Stories
              </p>
            </div>
            </div>
            <div className="flex items-center space-x-2">
              <span>⚡</span>
              <span className="text-xs text-muted-foreground">Powered by AI • Moderated for Safety • Built with Love</span>
              <span>✨</span>
            </div>
          

                    <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="text-xs hover:bg-purple-100 dark:hover:bg-purple-900/20">
              🛡️ Safety
            </Button>
            <Button variant="ghost" size="sm" className="text-xs hover:bg-pink-100 dark:hover:bg-pink-900/20">
              💖 Help
            </Button>
            <Button variant="ghost" size="sm" className="text-xs hover:bg-blue-100 dark:hover:bg-blue-900/20">
              👩‍👩‍👦 Parents
            </Button>
          </div>
        </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;





