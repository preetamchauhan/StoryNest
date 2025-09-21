import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

const MyStoriesButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/20 text-xs sm:text-sm px-2 sm:px-3"
      onClick={() => navigate('/my-stories')}
    >
      <span className="sm:hidden">📖</span>
      <span className="hidden sm:inline">📖 My Stories</span>
    </Button>
  );
};

export default MyStoriesButton;
