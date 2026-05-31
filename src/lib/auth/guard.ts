import { redirect } from "@tanstack/react-router";
import { hasValidSession } from "./session";

export const requireAuth = (): void => {
  if (typeof window === "undefined") return;
  if (!hasValidSession()) {
    const pathname = window.location.pathname;
    const search = pathname && pathname !== "/login" ? { redirect: pathname } : undefined;
    throw redirect({ to: "/login", search });
  }
};

export const redirectIfAuthenticated = (): void => {
  if (typeof window === "undefined") return;
  if (hasValidSession()) {
    throw redirect({ to: "/" });
  }
};
