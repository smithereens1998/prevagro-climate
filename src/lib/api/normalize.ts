import type { CoordinateQuery, FarmCoordinate, FarmLatestIdentity } from "./types";

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
};

/** Corrige cadastro comum no Brasil (lat/lon positivos). */
export const normalizeCoordinatePair = (latitude: number, longitude: number): CoordinateQuery => {
  let lat = latitude;
  let lon = longitude;
  if (lat > 0 && lon > 0 && lat >= 5 && lat <= 35 && lon >= 30 && lon <= 75) {
    lat = -Math.abs(lat);
    lon = -Math.abs(lon);
  }
  return { latitude: lat, longitude: lon };
};

/** Postgres NUMERIC often serializes lat/lon as strings in JSON. */
export const normalizeFarmCoordinate = (raw: FarmCoordinate): FarmCoordinate => {
  const latitude = toNumber(raw.latitude);
  const longitude = toNumber(raw.longitude);
  const normalized = normalizeCoordinatePair(latitude, longitude);
  return {
    ...raw,
    id: toNumber(raw.id),
    user_id: toNumber(raw.user_id),
    latitude: normalized.latitude ?? latitude,
    longitude: normalized.longitude ?? longitude,
    polygon_id: raw.polygon_id ?? null,
  };
};

export const normalizeFarmLatestIdentity = (raw: FarmLatestIdentity): FarmLatestIdentity => {
  const latitude = raw.latitude == null ? null : toNumber(raw.latitude);
  const longitude = raw.longitude == null ? null : toNumber(raw.longitude);
  if (latitude == null || longitude == null) {
    return {
      ...raw,
      latitude,
      longitude,
      farm_location: raw.farm_location ?? null,
    };
  }
  const normalized = normalizeCoordinatePair(latitude, longitude);
  return {
    ...raw,
    latitude: normalized.latitude ?? latitude,
    longitude: normalized.longitude ?? longitude,
    farm_location: raw.farm_location ?? null,
  };
};

const COORD_MATCH_EPSILON = 0.002;

export const coordsNear = (
  a: { latitude: number | null; longitude: number | null },
  b: { latitude: number; longitude: number },
): boolean => {
  if (a.latitude == null || a.longitude == null) return false;
  if (!Number.isFinite(a.latitude) || !Number.isFinite(b.longitude)) return false;
  if (!Number.isFinite(b.latitude) || !Number.isFinite(b.longitude)) return false;
  return (
    Math.abs(a.latitude - b.latitude) <= COORD_MATCH_EPSILON &&
    Math.abs(a.longitude - b.longitude) <= COORD_MATCH_EPSILON
  );
};

export const resolveFarmDisplayName = (
  selectedFarm: FarmCoordinate | null,
  identity: FarmLatestIdentity | null,
  _farmCount: number,
  fallback = "Fazenda",
): string => {
  const coordinateName = selectedFarm?.name?.trim();
  if (coordinateName) return coordinateName;

  const identityName = identity?.farm_name?.trim();
  if (
    identityName &&
    selectedFarm &&
    identity &&
    coordsNear(identity, selectedFarm)
  ) {
    return identityName;
  }
  return identityName || fallback;
};

export const formatCoordinatePair = (
  latitude: number,
  longitude: number,
  digits = 4,
): string => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return "—";
  return `${latitude.toFixed(digits)}, ${longitude.toFixed(digits)}`;
};
