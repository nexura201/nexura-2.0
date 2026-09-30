import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import * as db from '../services/database';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (login: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    db.seedDatabase();
    const savedToken = localStorage.getItem('nexura_token');
    if (savedToken) {
      const u = db.getUserByToken(savedToken);
      if (u) {
        setUser(u);
        setToken(savedToken);
      } else {
        localStorage.removeItem('nexura_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (loginStr: string, password: string) => {
    const result = db.authenticateUser(loginStr, password);
    if (!result) throw new Error('INVALID_CREDENTIALS');
    setUser(result.user);
    setToken(result.token);
    localStorage.setItem('nexura_token', result.token);
  }, []);

  const register = useCallback(async (username: string, email: string, password: string, displayName: string) => {
    const user = db.createUser(username, email, password, displayName);
    const result = db.authenticateUser(user.email, password);
    if (result) {
      setUser(result.user);
      setToken(result.token);
      localStorage.setItem('nexura_token', result.token);
    }
  }, []);

  const logout = useCallback(() => {
    if (token) db.logoutUser(token);
    setUser(null);
    setToken(null);
    localStorage.removeItem('nexura_token');
  }, [token]);

  const refreshUser = useCallback(() => {
    if (token) {
      const u = db.getUserByToken(token);
      if (u) setUser(u);
    }
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
