import { SEED_USER_EMAIL, SEED_USER_PASSWORD } from "./credentials";
import { writeSession } from "./session";
import { AuthError, type AuthSession } from "./types";

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/**
 * Autenticação local até o backend expor `/auth/login`.
 * Troque o corpo desta função por `apiRequest` quando a API existir.
 */
export const authenticate = async (email: string, password: string): Promise<AuthSession> => {
  await new Promise((resolve) => setTimeout(resolve, 280));

  const normalized = normalizeEmail(email);

  if (!normalized.includes("@")) {
    throw new AuthError("Informe um e-mail válido.");
  }

  if (!password.trim()) {
    throw new AuthError("Informe sua senha.");
  }

  if (normalized !== SEED_USER_EMAIL || password !== SEED_USER_PASSWORD) {
    throw new AuthError("E-mail ou senha inválidos.");
  }

  const session: AuthSession = {
    email: normalized,
    displayName: "Prevagro",
    loggedInAt: new Date().toISOString(),
  };

  writeSession(session);
  return session;
};
