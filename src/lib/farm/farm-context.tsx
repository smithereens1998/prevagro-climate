import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCoordinates, useLatestFarmIdentity } from "@/lib/api/hooks";
import { apiQueryKeys } from "@/lib/api/query-keys";
import {
  normalizeFarmCoordinate,
  resolveFarmDisplayName,
  coordsNear,
} from "@/lib/api/normalize";
import type { CoordinateQuery, FarmCoordinate, FarmLatestIdentity } from "@/lib/api/types";
import { getStoredFarmId, setStoredFarmId } from "./storage";

type FarmContextValue = {
  farms: FarmCoordinate[];
  selectedFarm: FarmCoordinate | null;
  farmIdentity: FarmLatestIdentity | null;
  farmDisplayName: string;
  farmLocationLabel: string | null;
  selectFarm: (farm: FarmCoordinate) => void;
  isLoading: boolean;
  isError: boolean;
  refetchFarms: () => void;
  refetchFarmIdentity: () => void;
};

const FarmContext = createContext<FarmContextValue | null>(null);

export const FarmProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const coordinatesQuery = useCoordinates();
  const farms = useMemo(
    () => (coordinatesQuery.data ?? []).map(normalizeFarmCoordinate),
    [coordinatesQuery.data],
  );
  const identityQuery = useLatestFarmIdentity(farms.length > 0);
  const farmIdentity = identityQuery.data ?? null;
  const [selectedId, setSelectedId] = useState<number | null>(() => getStoredFarmId());

  useEffect(() => {
    if (coordinatesQuery.isLoading || farms.length === 0) return;

    const stored = getStoredFarmId();
    const match = stored ? farms.find((f) => f.id === stored) : null;
    if (match) {
      setSelectedId(match.id);
      return;
    }

    const first = farms[0];
    setSelectedId(first.id);
    setStoredFarmId(first.id);
  }, [coordinatesQuery.isLoading, farms]);

  const selectFarm = useCallback(
    (farm: FarmCoordinate) => {
      setSelectedId(farm.id);
      setStoredFarmId(farm.id);
      void queryClient.invalidateQueries({ queryKey: apiQueryKeys.farmScoped(farm.id) });
      void queryClient.invalidateQueries({ queryKey: apiQueryKeys.farmLatest });
    },
    [queryClient],
  );

  const selectedFarm = useMemo(
    () => farms.find((f) => f.id === selectedId) ?? null,
    [farms, selectedId],
  );

  const farmDisplayName = useMemo(
    () => resolveFarmDisplayName(selectedFarm, farmIdentity, farms.length),
    [selectedFarm, farmIdentity, farms.length],
  );

  const farmLocationLabel = useMemo(() => {
    const location = farmIdentity?.farm_location?.trim();
    if (!location) return null;
    if (farms.length === 1) return location;
    if (selectedFarm && farmIdentity && coordsNear(farmIdentity, selectedFarm)) return location;
    return null;
  }, [farmIdentity, farms.length, selectedFarm]);

  const value = useMemo(
    () => ({
      farms,
      selectedFarm,
      farmIdentity,
      farmDisplayName,
      farmLocationLabel,
      selectFarm,
      isLoading: coordinatesQuery.isLoading || identityQuery.isLoading,
      isError: coordinatesQuery.isError || identityQuery.isError,
      refetchFarms: () => {
        void coordinatesQuery.refetch();
      },
      refetchFarmIdentity: () => {
        void identityQuery.refetch();
      },
    }),
    [
      farms,
      selectedFarm,
      farmIdentity,
      farmDisplayName,
      farmLocationLabel,
      selectFarm,
      coordinatesQuery,
      identityQuery,
    ],
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
};

export const useFarm = () => {
  const ctx = useContext(FarmContext);
  if (!ctx) {
    throw new Error("useFarm deve ser usado dentro de FarmProvider");
  }
  return ctx;
};

export const useFarmLocation = (): CoordinateQuery => {
  const { selectedFarm } = useFarm();
  if (selectedFarm) {
    return { latitude: selectedFarm.latitude, longitude: selectedFarm.longitude };
  }
  return {};
};

export const useFarmLocationOrThrow = (): Required<CoordinateQuery> => {
  const location = useFarmLocation();
  if (location.latitude == null || location.longitude == null) {
    throw new Error("Nenhuma fazenda selecionada");
  }
  return { latitude: location.latitude, longitude: location.longitude };
};
