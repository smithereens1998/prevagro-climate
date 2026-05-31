import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFarmLocation } from "@/lib/farm/farm-context";
import { fetchAgroPolygons, fetchAgroSoil, fetchAgroWeather, fetchSatelliteHistory } from "./agromonitoring";
import {
  createCoordinate,
  fetchCoordinates,
  fetchLatestFarmIdentity,
  updateCoordinate,
} from "./farm-monitoring";
import { fetchDbHealth, fetchHealth } from "./health";
import { createLlmPrediction } from "./llm";
import {
  fetchDailyFullLatest,
  fetchHorizonFeatures,
  fetchHorizonFeaturesHistory,
} from "./pipeline";
import { apiQueryKeys } from "./query-keys";
import { ApiError } from "./client";
import type { CoordinatePayload, CoordinateQuery } from "./types";

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

export const useLatestFarmIdentity = (enabled = true) =>
  useQuery({
    queryKey: apiQueryKeys.farmLatest,
    queryFn: fetchLatestFarmIdentity,
    enabled,
    staleTime: STALE_MS,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 404) return false;
      return retryGet(failureCount, error);
    },
  });

export const useHorizonFeatures = (query?: CoordinateQuery) => {
  const location = useFarmLocation();
  const resolved = query ?? location;
  const enabled = resolved.latitude != null && resolved.longitude != null;
  return useQuery({
    queryKey: apiQueryKeys.horizonFeatures(resolved),
    queryFn: () => fetchHorizonFeatures(resolved),
    enabled,
    staleTime: STALE_MS,
    retry: retryGet,
  });
};

export const useHorizonFeaturesHistory = (query?: CoordinateQuery & { limit?: number }) => {
  const location = useFarmLocation();
  const resolved = { ...location, ...query };
  const enabled = resolved.latitude != null && resolved.longitude != null;
  return useQuery({
    queryKey: apiQueryKeys.horizonHistory(resolved),
    queryFn: () => fetchHorizonFeaturesHistory(resolved),
    enabled,
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

const SATELLITE_DAYS_DEFAULT = 90;

export const useSatelliteHistory = (polygonId: string | null | undefined, days = SATELLITE_DAYS_DEFAULT) => {
  const end = Math.floor(Date.now() / 1000);
  const start = end - days * 24 * 60 * 60;

  return useQuery({
    queryKey: apiQueryKeys.satelliteHistory(polygonId ?? "", start, end),
    queryFn: () => fetchSatelliteHistory({ polygonId: polygonId!, start, end }),
    enabled: Boolean(polygonId),
    staleTime: STALE_MS,
    retry: retryGet,
  });
};

export const useCreateCoordinateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { payload: CoordinatePayload; polygonId?: string }) =>
      createCoordinate(input.payload, input.polygonId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiQueryKeys.coordinates });
      void queryClient.invalidateQueries({ queryKey: apiQueryKeys.farmLatest });
    },
  });
};

export const useUpdateCoordinateMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      coordinateId: number;
      payload: CoordinatePayload;
      polygonId?: string;
    }) => updateCoordinate(input.coordinateId, input.payload, input.polygonId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: apiQueryKeys.coordinates });
      void queryClient.invalidateQueries({ queryKey: apiQueryKeys.farmLatest });
    },
  });
};

export const useLlmPredictionMutation = () => {
  const queryClient = useQueryClient();
  const location = useFarmLocation();

  return useMutation({
    mutationFn: () => {
      if (location.latitude == null || location.longitude == null) {
        throw new Error("Selecione uma fazenda antes de gerar a análise");
      }
      return createLlmPrediction({ ...location, limit: 20 });
    },
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
