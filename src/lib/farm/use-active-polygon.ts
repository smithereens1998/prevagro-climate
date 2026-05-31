import { useMemo } from "react";
import { useAgroPolygons } from "@/lib/api/hooks";
import { fetchAgroPolygon } from "@/lib/api/agromonitoring";
import { useQuery } from "@tanstack/react-query";
import { apiQueryKeys } from "@/lib/api/query-keys";
import type { AgroMonitoringPolygon } from "@/lib/agromonitoring-map";
import { useFarm } from "./farm-context";
import {
  resolveActivePolygon,
  resolvePolygonAreaHa,
  polygonToGeoJsonFeature,
  polygonMatchesCoordinate,
  syntheticFeatureFromCoordinate,
  boundsFromGeoJson,
  paddedBounds,
  type GeoJsonFeature,
} from "./polygon-utils";

export type ActivePolygonState = {
  polygon: AgroMonitoringPolygon | null;
  polygonId: string | null;
  areaHa: number | null;
  feature: GeoJsonFeature | null;
  bounds: [[number, number], [number, number]] | null;
  maxBounds: [[number, number], [number, number]] | null;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
};

export const useActivePolygon = (): ActivePolygonState => {
  const { selectedFarm } = useFarm();
  const polygonsQuery = useAgroPolygons();

  const listMatch = useMemo(() => {
    if (!polygonsQuery.data?.length) return null;
    return resolveActivePolygon(
      polygonsQuery.data,
      selectedFarm?.latitude,
      selectedFarm?.longitude,
      selectedFarm?.polygon_id,
    );
  }, [polygonsQuery.data, selectedFarm]);

  const detailQuery = useQuery({
    queryKey: apiQueryKeys.agroPolygon(selectedFarm?.polygon_id ?? listMatch?.id ?? ""),
    queryFn: () => fetchAgroPolygon(selectedFarm?.polygon_id ?? listMatch!.id),
    enabled: Boolean(selectedFarm?.polygon_id ?? listMatch?.id),
    staleTime: 5 * 60 * 1000,
  });

  const polygon = detailQuery.data ?? listMatch;
  const hasFarmCoordinate = selectedFarm?.latitude != null && selectedFarm?.longitude != null;
  const polygonCompatibleWithFarm =
    hasFarmCoordinate &&
    polygonMatchesCoordinate(polygon, selectedFarm.latitude, selectedFarm.longitude);

  const shouldUseRemotePolygon = Boolean(
    selectedFarm?.polygon_id || !hasFarmCoordinate || polygonCompatibleWithFarm,
  );

  const polygonId = shouldUseRemotePolygon
    ? (polygon?.id ?? selectedFarm?.polygon_id ?? null)
    : null;
  const areaHa = resolvePolygonAreaHa(polygon);

  const feature = useMemo(() => {
    if (shouldUseRemotePolygon && polygon) {
      return polygonToGeoJsonFeature(polygon, { farmName: selectedFarm?.name });
    }
    if (hasFarmCoordinate && selectedFarm) {
      return syntheticFeatureFromCoordinate({
        latitude: selectedFarm.latitude,
        longitude: selectedFarm.longitude,
        farmName: selectedFarm.name,
        areaHa,
      });
    }
    return null;
  }, [shouldUseRemotePolygon, polygon, hasFarmCoordinate, selectedFarm, areaHa]);

  const bounds = useMemo(() => boundsFromGeoJson(feature), [feature]);
  const maxBounds = useMemo(() => (bounds ? paddedBounds(bounds) : null), [bounds]);

  return {
    polygon: shouldUseRemotePolygon ? polygon : null,
    polygonId,
    areaHa,
    feature,
    bounds,
    maxBounds,
    isLoading: polygonsQuery.isLoading || detailQuery.isLoading,
    isError: polygonsQuery.isError || detailQuery.isError,
    refetch: () => {
      void polygonsQuery.refetch();
      void detailQuery.refetch();
    },
  };
};
