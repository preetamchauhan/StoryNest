import React, { createContext, useContext, useState } from 'react';
import { LanguageProvider } from './LanguageContext';

interface AppContextType {
  age: number;
  setAge: (age: number) => void;
  isDark: boolean;
  setIsDark: (isDark: boolean) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [age, setAge] = useState(6);
  const [isDark, setIsDark] = useState(false);

  return (
    <LanguageProvider>
      <AppContext.Provider value={{ age, setAge, isDark, setIsDark }}>
        {children}
      </AppContext.Provider>
    </LanguageProvider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
