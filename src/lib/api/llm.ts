import { apiRequest } from "./client";
import type { CoordinateQuery, LlmPrediction } from "./types";

export const createLlmPrediction = (query?: CoordinateQuery & { limit?: number }) =>
  apiRequest<LlmPrediction>("/llm/predictions", {
    method: "POST",
    params: {
      latitude: query?.latitude,
      longitude: query?.longitude,
      limit: query?.limit,
    },
  });
