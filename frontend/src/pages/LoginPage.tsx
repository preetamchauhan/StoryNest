import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth
    window.location.href = '/auth/google';
  };

  const handleLinkedInLogin = () => {
    // Redirect to LinkedIn OAuth
    window.location.href = '/auth/linkedin';
  };

  const handleGuestMode = () => {
    // Navigate to main app without authentication
    navigate('/home');
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1 className="login-title">🌟 Welcome to Mind Spark! 🌟</h1>
          <p className="login-subtitle">Let's create amazing stories together!</p>
        </div>

        <div className="login-options">
          <button className="login-btn google-btn" onClick={handleGoogleLogin}>
            <span className="btn-icon">🔍</span>
            <span className="btn-text">Continue with Google</span>
          </button>

          <button className="login-btn linkedin-btn" onClick={handleLinkedInLogin}>
            <span className="btn-icon">💼</span>
            <span className="btn-text">Continue with LinkedIn</span>
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          <button className="login-btn guest-btn" onClick={handleGuestMode}>
            <span className="btn-icon">👤</span>
            <span className="btn-text">Try as Guest</span>
          </button>
        </div>

        <div className="login-footer">
          <p className="safety-note">🔒 Safe & secure for kids • Parent-approved content</p>
        </div>
      </div>

      <div className="background-decorations">
        <div className="floating-emoji">🌈</div>
        <div className="floating-emoji">🚀</div>
        <div className="floating-emoji">✨</div>
        <div className="floating-emoji">📚</div>
        <div className="floating-emoji">🎨</div>
        <div className="floating-emoji">🎵</div>
      </div>
    </div>
  );
};

export default LoginPage;
