import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const authRequestId = useRef(0);

  const initializeWorkspace = async () => {
    const workspaces = await api.listWorkspaces();
    const selectedId = api.getWorkspaceId();
    const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedId);
    if (!selectedWorkspace) {
      api.setWorkspaceId(workspaces.find((workspace) => workspace.is_personal)?.id ?? null);
    }
  };

  const refreshUser = async () => {
    const requestId = ++authRequestId.current;
    try {
      const currentUser = await api.getMe();
      await initializeWorkspace();
      if (requestId === authRequestId.current) {
        setUser(currentUser);
      }
    } catch {
      if (requestId === authRequestId.current) {
        setUser(null);
        api.clearToken();
        api.setWorkspaceId(null);
      }
    } finally {
      if (requestId === authRequestId.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    api.clearToken();
    refreshUser();

    const handleAuthExpired = () => {
      setUser(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const requestId = ++authRequestId.current;
    try {
      const res = await api.login({ email, password });
      await initializeWorkspace();
      if (requestId === authRequestId.current) {
        setUser(res.user);
      }
    } finally {
      if (requestId === authRequestId.current) {
        setIsLoading(false);
      }
    }
  };

  const register = async (email: string, password: string, fullName: string) => {
    await api.register({ email, password, full_name: fullName });
    // Immediately log in upon registration
    await login(email, password);
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      api.setWorkspaceId(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
