import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FARM_CENTER } from "@/lib/geo/farm-data";
import { fetchAgroPolygons, fetchAgroSoil, fetchAgroWeather } from "./agromonitoring";
import { fetchCoordinates } from "./farm-monitoring";
import { fetchDbHealth, fetchHealth } from "./health";
import { createLlmPrediction } from "./llm";
import {
  fetchDailyFullLatest,
  fetchHorizonFeatures,
  fetchHorizonFeaturesHistory,
} from "./pipeline";
import { apiQueryKeys } from "./query-keys";
import { ApiError } from "./client";
import type { CoordinateQuery, FarmCoordinate } from "./types";

const STALE_MS = 5 * 60 * 1000;

const retryGet = (failureCount: number, error: Error) => {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
    return false;
  }
  return failureCount < 2;
};

export const useApiHealth = () =>
  useQuery({
    queryKey: apiQueryKeys.health,
    queryFn: fetchHealth,
    staleTime: STALE_MS,
    retry: retryGet,
  });

export const useApiDbHealth = (enabled = false) =>
  useQuery({
    queryKey: apiQueryKeys.dbHealth,
    queryFn: fetchDbHealth,
    enabled,
    staleTime: STALE_MS,
    retry: retryGet,
  });

export const useCoordinates = () =>
  useQuery({
    queryKey: apiQueryKeys.coordinates,
    queryFn: fetchCoordinates,
    staleTime: STALE_MS,
    retry: retryGet,
  });

export const usePrimaryCoordinate = (): FarmCoordinate | null => {
  const { data } = useCoordinates();
  if (!data?.length) return null;
  return data[0];
};

export const useFarmLocation = (): CoordinateQuery => {
  const primary = usePrimaryCoordinate();
  if (primary) {
    return { latitude: primary.latitude, longitude: primary.longitude };
  }
  const [lon, lat] = FARM_CENTER;
  return { latitude: lat, longitude: lon };
};

export const useHorizonFeatures = (query?: CoordinateQuery) => {
  const location = useFarmLocation();
  const resolved = query ?? location;
  return useQuery({
    queryKey: apiQueryKeys.horizonFeatures(resolved),
    queryFn: () => fetchHorizonFeatures(resolved),
    staleTime: STALE_MS,
    retry: retryGet,
  });
};

export const useHorizonFeaturesHistory = (query?: CoordinateQuery & { limit?: number }) => {
  const location = useFarmLocation();
  const resolved = { ...location, ...query };
  return useQuery({
    queryKey: apiQueryKeys.horizonHistory(resolved),
    queryFn: () => fetchHorizonFeaturesHistory(resolved),
    staleTime: STALE_MS,
    retry: retryGet,
  });
};

export const useDailyFullLatest = () =>
  useQuery({
    queryKey: apiQueryKeys.dailyFullLatest,
    queryFn: fetchDailyFullLatest,
    staleTime: 60 * 1000,
    retry: retryGet,
  });

export const useAgroPolygons = () =>
  useQuery({
    queryKey: apiQueryKeys.agroPolygons,
    queryFn: fetchAgroPolygons,
    staleTime: STALE_MS,
    retry: retryGet,
  });

export const useAgroWeather = (latitude: number, longitude: number, enabled = true) =>
  useQuery({
    queryKey: apiQueryKeys.agroWeather(latitude, longitude),
    queryFn: () => fetchAgroWeather(latitude, longitude),
    enabled,
    staleTime: STALE_MS,
    retry: retryGet,
  });

export const useAgroSoil = (latitude: number, longitude: number, enabled = true) =>
  useQuery({
    queryKey: apiQueryKeys.agroSoil(latitude, longitude),
    queryFn: () => fetchAgroSoil(latitude, longitude),
    enabled,
    staleTime: STALE_MS,
    retry: retryGet,
  });

export const useLlmPredictionMutation = () => {
  const queryClient = useQueryClient();
  const location = useFarmLocation();

  return useMutation({
    mutationFn: () => createLlmPrediction({ ...location, limit: 20 }),
    onSuccess: (data) => {
      queryClient.setQueryData(apiQueryKeys.llmPrediction(location), data);
    },
  });
};

export const useCachedLlmPrediction = () => {
  const location = useFarmLocation();
  return useQuery({
    queryKey: apiQueryKeys.llmPrediction(location),
    queryFn: () => createLlmPrediction({ ...location, limit: 20 }),
    enabled: false,
    staleTime: Infinity,
  });
};
