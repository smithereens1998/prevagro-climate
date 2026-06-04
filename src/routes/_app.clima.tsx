import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { SectionCard } from "@/components/ui-bits";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MetricHint } from "@/components/overview/MetricHint";
import { SemanticKpiCard } from "@/components/overview/SemanticKpiCard";
import { ClimaPageHero } from "@/components/clima/ClimaPageHero";
import { ClimaWeekForecast } from "@/components/clima/ClimaWeekForecast";
import { ClimaCharts } from "@/components/clima/ClimaCharts";
import { ClimaRiskInsight } from "@/components/clima/ClimaRiskInsight";
import { llmToStrategicInsight } from "@/lib/api/adapters";
import {
  buildClimaKpis,
  buildHorizonRiskSummary,
  forecastToRainChart,
  forecastToTempChart,
  forecastToWeekCards,
} from "@/lib/api/clima-adapters";
import {
  useCachedLlmPrediction,
  useHorizonFeatures,
  useLatestMonitoringObservation,
  useManualRefreshMutation,
  useSeasonalForecastDaily,
} from "@/lib/api/hooks";
import { formatCoordinatePair } from "@/lib/api/normalize";
import { METRIC_HINTS } from "@/lib/overview/metric-hints";
import { getClimaKpiVisual } from "@/lib/overview/metric-visuals";
import { useFarm, useFarmLocation } from "@/lib/farm/farm-context";

export const Route = createFileRoute("/_app/clima")({
  head: () => ({ meta: [{ title: "Clima · Prevagro" }] }),
  component: ClimaPage,
});

const kpiHintKeys: Record<string, keyof typeof METRIC_HINTS> = {
  temp: "forecastTemp",
  rain: "forecastRain",
  humidity: "humidity",
};

function ClimaPage() {
  const { selectedFarm, farmDisplayName, farmLocationLabel } = useFarm();
  const location = useFarmLocation();
  const hasLocation = location.latitude != null && location.longitude != null;

  const forecast30 = useSeasonalForecastDaily(30);
  const observation = useLatestMonitoringObservation();
  const horizon = useHorizonFeatures();
  const llmCache = useCachedLlmPrediction();
  const manualRefresh = useManualRefreshMutation();

  const kpis = buildClimaKpis(forecast30.data, observation.data);
  const weekCards = forecast30.data?.forecast ? forecastToWeekCards(forecast30.data.forecast) : [];
  const rainData = forecast30.data?.forecast ? forecastToRainChart(forecast30.data.forecast) : [];
  const tempData = forecast30.data?.forecast ? forecastToTempChart(forecast30.data.forecast) : [];

  const f30 = horizon.data?.features?.["30d"];
  const heatScore = f30?.heat_risk_score != null ? Math.round(f30.heat_risk_score * 100) : null;
  const waterScore = f30?.water_stress_score != null ? Math.round(f30.water_stress_score * 100) : null;
  const horizonRiskText = buildHorizonRiskSummary(heatScore, waterScore);
  const dryDays =
    f30?.projected_dry_days_ratio != null ? Math.round(f30.projected_dry_days_ratio * 30) : null;

  const prediction = llmCache.data;
  const hasLlm = Boolean(prediction?.diagnostico?.resumo);
  const llmInsight = hasLlm ? llmToStrategicInsight(prediction) : null;

  const isLoading = forecast30.isLoading || observation.isLoading || horizon.isLoading;
  const farmLabel = farmDisplayName || selectedFarm?.name || "Fazenda";
  const locationParts = [farmLocationLabel].filter(Boolean);
  const locationLine = locationParts.length > 0 ? locationParts.join(" · ") : "Localização não informada";
  const coordsLabel =
    selectedFarm != null
      ? formatCoordinatePair(selectedFarm.latitude, selectedFarm.longitude)
      : "Coordenadas indisponíveis";
  const sourceLabel = forecast30.data
    ? `${forecast30.data.model_name} · ${forecast30.data.source_name}`
    : "Open-Meteo · pipeline sazonal";

  const updatedLabel = forecast30.dataUpdatedAt
    ? new Date(forecast30.dataUpdatedAt).toLocaleString("pt-BR")
    : observation.dataUpdatedAt
      ? new Date(observation.dataUpdatedAt).toLocaleString("pt-BR")
      : "aguardando dados";

  const handleRefresh = () => {
    manualRefresh.mutate(undefined, {
      onSuccess: () => {
        void forecast30.refetch();
        void observation.refetch();
        void horizon.refetch();
      },
    });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <>
        <ClimaPageHero
          farmName={farmLabel}
          locationLine={locationLine}
          coordsLine={coordsLabel}
          sourceLabel={sourceLabel}
          updatedAt={updatedLabel}
          isLoading={isLoading}
          isRefreshing={manualRefresh.isPending}
          canRefresh={hasLocation}
          onRefresh={handleRefresh}
        />

        {(forecast30.isError || observation.isError || horizon.isError) && (
          <p className="mb-4 text-sm text-warning" role="status">
            Alguns dados não carregaram. Verifique o backend e execute o pipeline para esta fazenda.
          </p>
        )}

        {manualRefresh.isError && (
          <p className="mb-4 text-sm text-warning" role="status">
            Não foi possível atualizar os dados agora. Tente novamente em instantes.
          </p>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const hintKey = kpiHintKeys[kpi.id];
            const visual = getClimaKpiVisual(kpi.id, kpi.value);

            return (
              <SemanticKpiCard
                key={kpi.id}
                label={
                  hintKey ? (
                    <MetricHint
                      hint={METRIC_HINTS[hintKey]}
                      label={kpi.label}
                      className="text-sm text-muted-foreground"
                    />
                  ) : (
                    kpi.label
                  )
                }
                value={kpi.value}
                unit={kpi.unit}
                icon={kpi.icon}
                visual={visual}
              />
            );
          })}
        </div>

        <SectionCard
          title="Previsão 7 dias"
          subtitle="Resumo diário da janela operacional"
          className="mb-6"
          action={
            <MetricHint
              hint={METRIC_HINTS.chartClimate}
              label={<span className="text-xs text-muted-foreground">Como ler</span>}
            />
          }
        >
          <ClimaWeekForecast
            days={weekCards}
            isLoading={forecast30.isLoading}
            emptyMessage="Sem previsão diária. Clique em Atualizar agora ou execute o pipeline sazonal."
          />
        </SectionCard>

        <SectionCard
          title="Séries de 30 dias"
          subtitle="Chuva acumulada diária e faixa térmica"
          className="mb-6"
        >
          <ClimaCharts rainData={rainData} tempData={tempData} isLoading={forecast30.isLoading} />
        </SectionCard>

        <SectionCard title="Risco climático" subtitle="Horizonte de 30 dias e leitura assistida">
          {horizon.isLoading && !horizonRiskText && !hasLlm ? (
            <div className="flex h-32 items-center justify-center rounded-xl border border-border bg-surface/40">
              <Loader2 className="h-6 w-6 animate-spin text-brand-agri" />
            </div>
          ) : (
            <ClimaRiskInsight
              hasLlm={hasLlm}
              llmSummary={llmInsight?.summary}
              llmAction={llmInsight?.action}
              modelLabel={prediction?.metadata?.model_name ?? undefined}
              horizonText={horizonRiskText}
              heatScore={heatScore}
              waterScore={waterScore}
              projectedRainMm={f30?.projected_total_precip_mm}
              dryDays={dryDays}
            />
          )}
        </SectionCard>
      </>
    </TooltipProvider>
  );
}
