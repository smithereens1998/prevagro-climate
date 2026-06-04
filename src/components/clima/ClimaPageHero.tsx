import { CloudSun, Loader2, RefreshCw } from "lucide-react";
import { PipelineStatusBadge } from "@/components/PipelineStatusBadge";
import { Button } from "@/components/ui/button";

type ClimaPageHeroProps = {
  farmName: string;
  locationLine: string;
  coordsLine: string;
  sourceLabel: string;
  updatedAt: string;
  isLoading: boolean;
  isRefreshing: boolean;
  canRefresh: boolean;
  onRefresh: () => void;
};

export const ClimaPageHero = ({
  farmName,
  locationLine,
  coordsLine,
  sourceLabel,
  updatedAt,
  isLoading,
  isRefreshing,
  canRefresh,
  onRefresh,
}: ClimaPageHeroProps) => (
  <div className="brand-accent-bar mb-6 flex flex-col gap-4 rounded-xl border border-border bg-gradient-to-br from-white via-surface to-brand-light/10 p-4 md:flex-row md:items-start md:justify-between md:p-5">
    <div className="min-w-0 space-y-2">
      <div className="flex items-center gap-2 text-brand-forest">
        <CloudSun className="h-5 w-5 shrink-0 text-brand-agri" aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-dark/70">
          Inteligência climática
        </span>
      </div>
      <h1 className="truncate text-xl font-semibold tracking-tight text-brand-dark md:text-2xl">
        {farmName}
      </h1>
      <p className="text-sm text-muted-foreground">{locationLine}</p>
      <p className="text-xs text-muted-foreground/80">{coordsLine}</p>
      <p className="text-xs text-muted-foreground">
        Fonte: <span className="text-foreground/80">{sourceLabel}</span>
        {" · "}
        Atualizado: <span className="text-foreground/80">{updatedAt}</span>
      </p>
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <PipelineStatusBadge />
      <Button
        size="sm"
        onClick={onRefresh}
        disabled={isLoading || isRefreshing || !canRefresh}
      >
        {isLoading || isRefreshing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Atualizar agora
      </Button>
    </div>
  </div>
);
