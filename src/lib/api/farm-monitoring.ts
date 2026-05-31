import { ApiError, apiRequest } from "./client";
import { normalizeFarmCoordinate, normalizeFarmLatestIdentity } from "./normalize";
import type { CoordinatePayload, CoordinateQuery, FarmCoordinate, FarmLatestIdentity, FarmMonitoringObservation } from "./types";

export const fetchCoordinates = async () => {
  const rows = await apiRequest<FarmCoordinate[]>("/farm-monitoring/coordinates");
  return rows.map(normalizeFarmCoordinate);
};

export const fetchLatestFarmIdentity = async (): Promise<FarmLatestIdentity | null> => {
  try {
    const row = await apiRequest<FarmLatestIdentity>("/farm-monitoring/latest");
    return normalizeFarmLatestIdentity(row);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const fetchLatestMonitoringObservation = async (query?: CoordinateQuery) => {
  try {
    return await apiRequest<FarmMonitoringObservation>("/farm-monitoring/observations/latest", {
      params: {
        latitude: query?.latitude,
        longitude: query?.longitude,
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return null;
    }
    throw error;
  }
};

export const createCoordinate = async (payload: CoordinatePayload, polygonId?: string) => {
  const result = await apiRequest<{ coordinate: FarmCoordinate; polygon_sync: Record<string, unknown> }>(
    "/farm-monitoring/coordinates",
    {
      method: "POST",
      body: JSON.stringify(payload),
      params: polygonId ? { polygonId } : undefined,
    },
  );
  return { ...result, coordinate: normalizeFarmCoordinate(result.coordinate) };
};

export const updateCoordinate = async (
  coordinateId: number,
  payload: CoordinatePayload,
  polygonId?: string,
) => {
  const result = await apiRequest<{ coordinate: FarmCoordinate; polygon_sync: Record<string, unknown> }>(
    `/farm-monitoring/coordinates/${coordinateId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
      params: polygonId ? { polygonId } : undefined,
    },
  );
  return { ...result, coordinate: normalizeFarmCoordinate(result.coordinate) };
};

export const deleteCoordinate = (coordinateId: number) =>
  apiRequest<{ status: string; coordinate_id: number }>(
    `/farm-monitoring/coordinates/${coordinateId}`,
    { method: "DELETE" },
  );
