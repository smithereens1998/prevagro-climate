import { apiRequest } from "./client";
import type { AgroMonitoringPolygon } from "@/lib/agromonitoring-map";
import type { AgroSoilResponse, AgroWeatherResponse, SatelliteHistoryItem } from "./types";

export const fetchAgroPolygons = () =>
  apiRequest<AgroMonitoringPolygon[]>("/agromonitoring/polygons");

export const fetchAgroPolygon = (polygonId: string) =>
  apiRequest<AgroMonitoringPolygon>(`/agromonitoring/polygons/${polygonId}`);

export const fetchAgroWeather = (latitude: number, longitude: number) =>
  apiRequest<AgroWeatherResponse>("/agromonitoring/weather", {
    params: { lat: latitude, lon: longitude },
  });

export const fetchAgroSoil = (latitude: number, longitude: number) =>
  apiRequest<AgroSoilResponse>("/agromonitoring/soil", {
    params: { lat: latitude, lon: longitude },
  });

export const fetchSatelliteHistory = (params: { polygonId: string; start: number; end: number }) =>
  apiRequest<SatelliteHistoryItem[]>("/agromonitoring/satellite/history", {
    params: {
      polygonId: params.polygonId,
      start: params.start,
      end: params.end,
    },
  });
