import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import MyStoriesPage from './pages/MyStoriesPage';
import LoginPage from './pages/LoginPage';
import './App.css';

function App() {
  return (
    <AppProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/home" element={
            <Layout>
              <HomePage />
            </Layout>
          } />
          <Route path="/my-stories" element={<MyStoriesPage />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
