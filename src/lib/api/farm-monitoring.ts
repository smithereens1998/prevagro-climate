import { apiRequest } from "./client";
import type { CoordinatePayload, FarmCoordinate } from "./types";

export const fetchCoordinates = () => apiRequest<FarmCoordinate[]>("/farm-monitoring/coordinates");

export const createCoordinate = (payload: CoordinatePayload, polygonId?: string) =>
  apiRequest<{ coordinate: FarmCoordinate; polygon_sync: Record<string, unknown> }>(
    "/farm-monitoring/coordinates",
    {
      method: "POST",
      body: JSON.stringify(payload),
      params: polygonId ? { polygonId } : undefined,
    },
  );

export const updateCoordinate = (
  coordinateId: number,
  payload: CoordinatePayload,
  polygonId?: string,
) =>
  apiRequest<{ coordinate: FarmCoordinate; polygon_sync: Record<string, unknown> }>(
    `/farm-monitoring/coordinates/${coordinateId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
      params: polygonId ? { polygonId } : undefined,
    },
  );

export const deleteCoordinate = (coordinateId: number) =>
  apiRequest<{ status: string; coordinate_id: number }>(
    `/farm-monitoring/coordinates/${coordinateId}`,
    { method: "DELETE" },
  );
