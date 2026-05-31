import { apiRequest } from "./client";
import type { HealthStatus } from "./types";

export const fetchHealth = () => apiRequest<HealthStatus>("/health");

export const fetchDbHealth = () => apiRequest<HealthStatus>("/health/db");
