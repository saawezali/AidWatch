import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const ACCESS_TOKEN_KEY = 'aidwatch-access-token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
  });

  // Update axios defaults when token changes
  useEffect(() => {
    if (accessToken) {
      api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
      localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    } else {
      delete api.defaults.headers.common['Authorization'];
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }, [accessToken]);

  // Fetch user on mount if we have a token
  useEffect(() => {
    const initAuth = async () => {
      if (accessToken) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
        } catch (error) {
          // Token might be expired, try to refresh
          const refreshed = await refreshTokenInternal();
          if (!refreshed) {
            // Refresh failed, clear everything
            setAccessToken(null);
            setUser(null);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []); // Only run on mount

  const refreshTokenInternal = async (): Promise<boolean> => {
    try {
      const response = await api.post('/auth/refresh', {}, { 
        withCredentials: true 
      });
      const newToken = response.data.accessToken;
      setAccessToken(newToken);
      
      // Fetch user with new token
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      
      return true;
    } catch {
      return false;
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password }, {
      withCredentials: true
    });
    
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name }, {
      withCredentials: true
    });
    
    setAccessToken(response.data.accessToken);
    setUser(response.data.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout', {}, { withCredentials: true });
    } catch {
      // Ignore errors during logout
    }
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    return refreshTokenInternal();
  }, []);

  const refreshUser = useCallback(async () => {
    if (accessToken) {
      try {
        const response = await api.get('/auth/me');
        setUser(response.data);
      } catch {
        // Ignore errors
      }
    }
  }, [accessToken]);

  // Set up axios interceptor for automatic token refresh
  useEffect(() => {
    const interceptor = api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // If we get a 401 with TOKEN_EXPIRED code and haven't retried yet
        if (
          error.response?.status === 401 && 
          error.response?.data?.code === 'TOKEN_EXPIRED' &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          
          const refreshed = await refreshTokenInternal();
          if (refreshed) {
            // Retry the original request with new token
            originalRequest.headers['Authorization'] = `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}`;
            return api(originalRequest);
          }
        }
        
        return Promise.reject(error);
      }
    );

    return () => {
      api.interceptors.response.eject(interceptor);
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshToken,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
