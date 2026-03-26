'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// ============================================================================
// Auth Context
// ============================================================================

interface AdminAuthContext {
  isAuthenticated: boolean;
  token: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContext | null>(null);

export function useAdminAuth(): AdminAuthContext {
  const context = useContext(AdminAuthContext);
  if (context === null) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
}

// ============================================================================
// Auth Provider
// ============================================================================

export function AdminAuthProvider({ children }: { children: ReactNode }): ReactNode {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for saved token
    const savedToken = localStorage.getItem('admin_token');
    if (savedToken !== null && savedToken.length > 0) {
      setToken(savedToken);
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  const login = async (password: string): Promise<boolean> => {
    try {
      // Test the token against the API
      const response = await fetch('/api/admin/health', {
        headers: {
          Authorization: `Bearer ${password}`,
        },
      });

      if (response.ok) {
        setToken(password);
        setIsAuthenticated(true);
        localStorage.setItem('admin_token', password);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  const logout = (): void => {
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem('admin_token');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-800 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <AdminAuthContext.Provider value={{ isAuthenticated, token, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}
