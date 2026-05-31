import type { FarmCoordinate, FarmLatestIdentity } from "./types";

const toNumber = (value: unknown): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.NaN;
};

/** Postgres NUMERIC often serializes lat/lon as strings in JSON. */
export const normalizeFarmCoordinate = (raw: FarmCoordinate): FarmCoordinate => ({
  ...raw,
  id: toNumber(raw.id),
  user_id: toNumber(raw.user_id),
  latitude: toNumber(raw.latitude),
  longitude: toNumber(raw.longitude),
  polygon_id: raw.polygon_id ?? null,
});

export const normalizeFarmLatestIdentity = (raw: FarmLatestIdentity): FarmLatestIdentity => ({
  ...raw,
  latitude: raw.latitude == null ? null : toNumber(raw.latitude),
  longitude: raw.longitude == null ? null : toNumber(raw.longitude),
  farm_location: raw.farm_location ?? null,
});

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
  farmCount: number,
  fallback = "Fazenda",
): string => {
  const identityName = identity?.farm_name?.trim();
  if (identityName) {
    if (farmCount === 1) return identityName;
    if (selectedFarm && identity && coordsNear(identity, selectedFarm)) return identityName;
  }
  const coordinateName = selectedFarm?.name?.trim();
  if (coordinateName) return coordinateName;
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
