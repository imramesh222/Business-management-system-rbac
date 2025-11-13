'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUserWithFallback, User, isAuthenticated as checkAuth } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (userData: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in on initial load
    const checkUser = async () => {
      try {
        const currentUser = getCurrentUserWithFallback();
        setUser(currentUser);
      } catch (error) {
        console.error('Error checking auth status:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('access_token'));
    }
  };

  const logout = () => {
    // Clear tokens from storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    setUser(null);
    router.push('/login');
  };

  const isAuthenticated = () => {
    return checkAuth();
  };

  // Get token safely
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      token: getToken(),
      login,
      logout,
      isAuthenticated: checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
