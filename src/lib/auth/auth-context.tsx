"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "@tanstack/react-router";
import { authenticate } from "./login";
import { clearSession, readSession } from "./session";
import { AuthError, type AuthSession } from "./types";

type AuthContextValue = {
  session: AuthSession | null;
  isReady: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setSession(readSession());
    setIsReady(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const next = await authenticate(email, password);
      setSession(next);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      throw new AuthError("Não foi possível entrar. Tente novamente.");
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    navigate({ to: "/login" });
  }, [navigate]);

  const value = useMemo(
    () => ({
      session,
      isReady,
      isAuthenticated: Boolean(session),
      login,
      logout,
    }),
    [session, isReady, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth deve ser usado dentro de AuthProvider");
  }
  return ctx;
};
