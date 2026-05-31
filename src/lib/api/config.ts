const DEFAULT_API_BASE = "http://127.0.0.1:8000";

export const getApiBaseUrl = (): string => {
  const raw = import.meta.env.VITE_API_BASE_URL?.trim();
  if (!raw) return DEFAULT_API_BASE;
  return raw.replace(/\/$/, "");
};

export const isApiConfigured = (): boolean =>
  Boolean(import.meta.env.VITE_API_BASE_URL?.trim() || import.meta.env.DEV);
