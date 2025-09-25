import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, foodPassword: string[]) => Promise<void>;
  register: (username: string, foodPassword: string[]) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load user from session storage on app start
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = sessionStorage.getItem('user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Failed to parse saved user:', error);
          localStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
      }

      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username: string, foodPassword: string[]) => {
    const response = await api.post('/api/auth/login', {
      username,
      food_password: foodPassword,
    });

    if (response.success) {
      localStorage.setItem('token', response.access_token);
      sessionStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
    } else {
      throw new Error(response.error || 'Login failed');
    }
  };

  const register = async (username: string, foodPassword: string[]) => {
    const response = await api.post('/api/auth/register', {
      username,
      food_password: foodPassword,
    });

    if (response.success) {
      localStorage.setItem('token', response.access_token);
      sessionStorage.setItem('user', JSON.stringify(response.user));
      setUser(response.user);
    } else {
      throw new Error(response.error || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
