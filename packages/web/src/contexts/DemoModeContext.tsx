import { createContext, useContext, useState, ReactNode } from 'react';

interface DemoModeContextValue {
  isDemo: boolean;
  apiKey: string | null;
  setApiKey: (key: string | null) => void;
  isAdmin: boolean;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

const API_KEY_STORAGE = 'aidwatch-api-key';

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(API_KEY_STORAGE);
    }
    return null;
  });

  const setApiKey = (key: string | null) => {
    setApiKeyState(key);
    if (key) {
      localStorage.setItem(API_KEY_STORAGE, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  };

  const isDemo = !apiKey;
  const isAdmin = !!apiKey;

  return (
    <DemoModeContext.Provider value={{ isDemo, apiKey, setApiKey, isAdmin }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode() {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
