import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { AuthContext } from './auth-context';
import type { User } from '../types';

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
    void Promise.resolve().then(refreshUser);

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
