import type { CoordinateQuery } from "./types";

export const apiQueryKeys = {
  health: ["api", "health"] as const,
  dbHealth: ["api", "health", "db"] as const,
  coordinates: ["farm-monitoring", "coordinates"] as const,
  agroPolygons: ["agromonitoring", "polygons"] as const,
  agroWeather: (lat: number, lon: number) => ["agromonitoring", "weather", lat, lon] as const,
  agroSoil: (lat: number, lon: number) => ["agromonitoring", "soil", lat, lon] as const,
  horizonFeatures: (q?: CoordinateQuery) =>
    ["pipeline", "horizon-features", q?.latitude, q?.longitude] as const,
  horizonHistory: (q?: CoordinateQuery & { limit?: number }) =>
    ["pipeline", "horizon-features", "history", q?.latitude, q?.longitude, q?.limit] as const,
  dailyFullLatest: ["pipeline", "daily-full", "latest"] as const,
  llmPrediction: (q?: CoordinateQuery) =>
    ["llm", "predictions", q?.latitude, q?.longitude] as const,
};
