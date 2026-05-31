import type { AgroMonitoringPolygon } from "@/lib/agromonitoring-map";

export type GeoJsonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown;
  };
};

const toRadians = (value: number) => (value * Math.PI) / 180;

/** Distância aproximada em km entre dois pontos. */
export const distanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const resolvePolygonAreaHa = (polygon: AgroMonitoringPolygon | null | undefined) => {
  if (!polygon?.area || polygon.area <= 0) return null;
  return Math.round(polygon.area);
};

export const polygonCenterLatLon = (polygon: AgroMonitoringPolygon | null | undefined) => {
  const center = polygon?.center;
  if (!center || center.length < 2) return null;
  const [lon, lat] = center;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return { latitude: lat, longitude: lon };
};

export const polygonMatchesCoordinate = (
  polygon: AgroMonitoringPolygon | null | undefined,
  latitude: number,
  longitude: number,
  maxDistanceKm = 100,
) => {
  const center = polygonCenterLatLon(polygon);
  if (!center) return false;
  const dist = distanceKm(latitude, longitude, center.latitude, center.longitude);
  return dist <= maxDistanceKm;
};

export const polygonToGeoJsonFeature = (
  polygon: AgroMonitoringPolygon,
  extraProperties: Record<string, unknown> = {},
): GeoJsonFeature | null => {
  const geometry = polygon.geo_json?.geometry;
  if (!geometry?.coordinates) return null;

  return {
    type: "Feature",
    properties: {
      name: polygon.name ?? polygon.id,
      polygonId: polygon.id,
      areaHa: resolvePolygonAreaHa(polygon),
      ...extraProperties,
    },
    geometry: {
      type: geometry.type ?? "Polygon",
      coordinates: geometry.coordinates,
    },
  };
};

export const boundsFromGeoJson = (
  feature: GeoJsonFeature | null,
): [[number, number], [number, number]] | null => {
  if (!feature?.geometry?.coordinates) return null;

  const ring = (feature.geometry.coordinates as number[][][])[0];
  if (!ring?.length) return null;

  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const [lon, lat] of ring) {
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    minLon = Math.min(minLon, lon);
    minLat = Math.min(minLat, lat);
    maxLon = Math.max(maxLon, lon);
    maxLat = Math.max(maxLat, lat);
  }

  if (!Number.isFinite(minLon)) return null;
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
};

export const paddedBounds = (
  bounds: [[number, number], [number, number]],
  pad = 0.02,
): [[number, number], [number, number]] => {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds;
  return [
    [minLon - pad, minLat - pad],
    [maxLon + pad, maxLat + pad],
  ];
};

export const findPolygonById = (
  polygons: AgroMonitoringPolygon[],
  polygonId: string | null | undefined,
) => {
  if (!polygonId) return null;
  return polygons.find((p) => p.id === polygonId) ?? null;
};

export const findNearestPolygon = (
  polygons: AgroMonitoringPolygon[],
  latitude: number,
  longitude: number,
) => {
  if (!polygons.length) return null;

  let best = polygons[0];
  let bestDistance = Infinity;

  for (const polygon of polygons) {
    const center = polygon.center;
    if (!center || center.length < 2) continue;
    const [lng, lat] = center;
    const dist = distanceKm(latitude, longitude, lat, lng);
    if (dist < bestDistance) {
      bestDistance = dist;
      best = polygon;
    }
  }

  return best;
};

export const resolveActivePolygon = (
  polygons: AgroMonitoringPolygon[],
  latitude: number | undefined,
  longitude: number | undefined,
  storedPolygonId: string | null | undefined,
) => {
  if (!polygons.length) return null;

  const byId = findPolygonById(polygons, storedPolygonId);
  if (byId) return byId;

  if (latitude != null && longitude != null) {
    return findNearestPolygon(polygons, latitude, longitude);
  }

  return polygons[0] ?? null;
};

export const centroidFromFeature = (feature: GeoJsonFeature | null): [number, number] | null => {
  const bounds = boundsFromGeoJson(feature);
  if (!bounds) return null;
  const [[minLon, minLat], [maxLon, maxLat]] = bounds;
  return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
};

const metersToLatDegrees = (meters: number) => meters / 111_320;

const metersToLonDegrees = (meters: number, latitude: number) => {
  const cosLat = Math.cos(toRadians(latitude));
  if (!Number.isFinite(cosLat) || Math.abs(cosLat) < 0.000001) return metersToLatDegrees(meters);
  return meters / (111_320 * cosLat);
};

export const syntheticFeatureFromCoordinate = ({
  latitude,
  longitude,
  farmName,
  areaHa = 203,
}: {
  latitude: number;
  longitude: number;
  farmName?: string;
  areaHa?: number | null;
}): GeoJsonFeature => {
  const areaMeters = Math.max((areaHa ?? 203) * 10_000, 50_000);
  const sideMeters = Math.sqrt(areaMeters);
  const halfLat = metersToLatDegrees(sideMeters / 2);
  const halfLon = metersToLonDegrees(sideMeters / 2, latitude);

  return {
    type: "Feature",
    properties: {
      name: farmName ?? "Fazenda",
      polygonId: null,
      areaHa: areaHa ?? null,
      synthetic: true,
    },
    geometry: {
      type: "Polygon",
      coordinates: [
        [
          [longitude - halfLon, latitude - halfLat],
          [longitude + halfLon, latitude - halfLat],
          [longitude + halfLon, latitude + halfLat],
          [longitude - halfLon, latitude + halfLat],
          [longitude - halfLon, latitude - halfLat],
        ],
      ],
    },
  };
};

export const riskScoreToFillColor = (score: number | null | undefined) => {
  if (score == null) return "#7CEC52";
  if (score >= 70) return "#ef4444";
  if (score >= 40) return "#F4B400";
  return "#6BE234";
};
