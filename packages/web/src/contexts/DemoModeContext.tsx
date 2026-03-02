import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface DemoModeContextValue {
  isDemo: boolean;
  isAdmin: boolean;
}

const DemoModeContext = createContext<DemoModeContextValue | undefined>(undefined);

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();

  // User is in demo mode if not authenticated
  const isDemo = !isAuthenticated;
  
  // User is admin if authenticated with ADMIN role
  const isAdmin = isAuthenticated && user?.role === 'ADMIN';

  return (
    <DemoModeContext.Provider value={{ isDemo, isAdmin }}>
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

