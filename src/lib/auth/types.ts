export type AuthSession = {
  email: string;
  displayName: string;
  loggedInAt: string;
};

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}
