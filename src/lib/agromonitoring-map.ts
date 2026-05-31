export type LngLat = [number, number];
export type LatLng = [number, number];

export interface AgroMonitoringPolygon {
  id: string;
  name?: string;
  center?: LngLat;
  area?: number;
  geo_json?: {
    type: "Feature";
    geometry?: {
      type?: "Polygon";
      coordinates?: LngLat[][];
    };
  };
}

export interface LeafletCircleConfig {
  center: LatLng;
  radius: number;
}

export function lngLatToLatLng(point: LngLat): LatLng {
  const [lng, lat] = point;
  return [lat, lng];
}

export function polygonToLeafletPositions(polygon: AgroMonitoringPolygon): LatLng[] {
  const ring = polygon.geo_json?.geometry?.coordinates?.[0];
  if (!ring || ring.length === 0) return [];
  return ring.map(lngLatToLatLng);
}

export function polygonCenterToLeaflet(polygon: AgroMonitoringPolygon): LatLng | null {
  if (!polygon.center || polygon.center.length < 2) return null;
  return lngLatToLatLng(polygon.center);
}

export function estimateCircleFromArea(polygon: AgroMonitoringPolygon): LeafletCircleConfig | null {
  const center = polygonCenterToLeaflet(polygon);
  if (!center || !polygon.area || polygon.area <= 0) return null;

  // AgroMonitoring commonly provides area in hectares.
  const areaMetersSquared = polygon.area * 10_000;
  const radius = Math.sqrt(areaMetersSquared / Math.PI);
  return { center, radius };
}
