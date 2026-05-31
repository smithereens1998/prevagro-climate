import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useFarm } from "@/lib/farm/farm-context";

const FARM_SETUP_PREFIX = "/fazendas";

export const FarmGuard = ({ children }: { children: React.ReactNode }) => {
  const { farms, isLoading, isError } = useFarm();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isFarmSetupRoute = pathname.startsWith(FARM_SETUP_PREFIX);

  useEffect(() => {
    if (isLoading || isError || isFarmSetupRoute) return;
    if (farms.length === 0) {
      void navigate({ to: "/fazendas/nova" });
    }
  }, [farms.length, isError, isFarmSetupRoute, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Carregando fazendas" />
      </div>
    );
  }

  if (!isFarmSetupRoute && farms.length === 0) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Redirecionando" />
      </div>
    );
  }

  return children;
};
