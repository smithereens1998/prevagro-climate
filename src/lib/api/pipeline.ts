import { apiRequest } from "./client";
import type {
  CoordinateQuery,
  DailyFullLatest,
  HorizonFeaturesHistory,
  HorizonFeaturesSnapshot,
  SeasonalForecastDaily,
} from "./types";

export const fetchHorizonFeatures = (query?: CoordinateQuery) =>
  apiRequest<HorizonFeaturesSnapshot>("/pipeline/horizon-features", {
    params: {
      latitude: query?.latitude,
      longitude: query?.longitude,
    },
  });

export const fetchHorizonFeaturesHistory = (query?: CoordinateQuery & { limit?: number }) =>
  apiRequest<HorizonFeaturesHistory>("/pipeline/horizon-features/history", {
    params: {
      latitude: query?.latitude,
      longitude: query?.longitude,
      limit: query?.limit,
    },
  });

export const fetchSeasonalForecastDaily = (query?: CoordinateQuery & { days?: number }) =>
  apiRequest<SeasonalForecastDaily>("/pipeline/seasonal-forecast/daily", {
    params: {
      latitude: query?.latitude,
      longitude: query?.longitude,
      days: query?.days ?? 30,
    },
  });

export const fetchDailyFullLatest = () =>
  apiRequest<DailyFullLatest>("/pipeline/daily-full/latest");

export const runDailyIngestion = () =>
  apiRequest<Record<string, unknown>>("/pipeline/daily-ingestion", { method: "POST" });

export const runSeasonalForecast = () =>
  apiRequest<Record<string, unknown>>("/pipeline/seasonal-forecast", { method: "POST" });

export const runManualRefresh = () =>
  apiRequest<Record<string, unknown>>("/pipeline/manual-refresh", { method: "PUT" });

export const runDailyFull = (force = false) =>
  apiRequest<Record<string, unknown>>("/pipeline/daily-full", {
    method: "POST",
    params: { force, trigger_source: "frontend" },
  });
