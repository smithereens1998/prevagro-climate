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
  const polygonId = polygon?.id ?? selectedFarm?.polygon_id ?? null;

  const feature = useMemo(
    () => (polygon ? polygonToGeoJsonFeature(polygon, { farmName: selectedFarm?.name }) : null),
    [polygon, selectedFarm?.name],
  );

  const bounds = useMemo(() => boundsFromGeoJson(feature), [feature]);
  const maxBounds = useMemo(() => (bounds ? paddedBounds(bounds) : null), [bounds]);

  return {
    polygon,
    polygonId,
    areaHa: resolvePolygonAreaHa(polygon),
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
