import type { AuthSession } from "./types";

const STORAGE_KEY = "prevagro.auth.session";

const isBrowser = (): boolean => typeof window !== "undefined";

export const readSession = (): AuthSession | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.email || !parsed?.loggedInAt) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const writeSession = (session: AuthSession): void => {
  if (!isBrowser()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
};

export const clearSession = (): void => {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const hasValidSession = (): boolean => Boolean(readSession());

export const getSessionInitials = (session: AuthSession | null): string => {
  if (!session?.email) return "PV";
  const local = session.email.split("@")[0] ?? "";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || "PV";
};
