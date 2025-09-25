import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import FoodAuth from '../components/FoodAuth';

const LoginPage: React.FC = () => {
  const { user } = useAuth();

  // Redirect to home if already authenticated
  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Story Nest</h1>
          <p className="text-white/80">Create magical stories with AI</p>
        </div>
        <FoodAuth />
      </div>
    </div>
  );
};

export default LoginPage;
