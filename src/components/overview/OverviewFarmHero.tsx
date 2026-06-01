import { FileText, Loader2, RefreshCw } from "lucide-react";
import { PipelineStatusBadge } from "@/components/PipelineStatusBadge";
import { Button } from "@/components/ui/button";

type OverviewFarmHeroProps = {
  farmName: string;
  locationLine: string;
  coordsLine: string;
  updatedAt: string;
  isLoading: boolean;
  isGenerating: boolean;
  canGenerate: boolean;
  onRefresh: () => void;
  onGenerate: () => void;
};

export const OverviewFarmHero = ({
  farmName,
  locationLine,
  coordsLine,
  updatedAt,
  isLoading,
  isGenerating,
  canGenerate,
  onRefresh,
  onGenerate,
}: OverviewFarmHeroProps) => (
  <div className="mb-6 flex flex-col gap-4 rounded-xl border border-border bg-surface/80 p-4 md:flex-row md:items-start md:justify-between md:p-5">
    <div className="min-w-0 space-y-1.5">
      <h1 className="truncate text-xl font-semibold tracking-tight text-foreground md:text-2xl">
        {farmName}
      </h1>
      <p className="text-sm text-muted-foreground">{locationLine}</p>
      <p className="text-xs text-muted-foreground/80">{coordsLine}</p>
      <p className="text-xs text-muted-foreground">
        Atualizado: <span className="text-foreground/80">{updatedAt}</span>
      </p>
    </div>
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <PipelineStatusBadge />
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={isLoading}>
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Atualizar
      </Button>
      <Button variant="outline" size="sm" onClick={onGenerate} disabled={isGenerating || !canGenerate}>
        {isGenerating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        Gerar diagnóstico
      </Button>
    </div>
  </div>
);
