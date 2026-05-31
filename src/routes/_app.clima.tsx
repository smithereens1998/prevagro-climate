import { createFileRoute } from "@tanstack/react-router";
import { Brain, CloudRain, Loader2, RefreshCw } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard, PageHeader, SectionCard } from "@/components/ui-bits";
import { PipelineStatusBadge } from "@/components/PipelineStatusBadge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MetricHint } from "@/components/overview/MetricHint";
import { chartTooltip } from "@/lib/farm-insights";
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
import { useFarm, useFarmLocation } from "@/lib/farm/farm-context";

export const Route = createFileRoute("/_app/clima")({
  head: () => ({ meta: [{ title: "Clima · Prevagro" }] }),
  component: ClimaPage,
});

const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex h-60 items-center justify-center rounded-lg border border-dashed border-border bg-surface/40 px-4 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

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

  const prediction = llmCache.data;
  const hasLlm = Boolean(prediction?.diagnostico?.resumo);
  const llmInsight = hasLlm ? llmToStrategicInsight(prediction) : null;

  const isLoading = forecast30.isLoading || observation.isLoading || horizon.isLoading;
  const farmLabel = farmDisplayName || selectedFarm?.name || "Fazenda";
  const coordsLabel =
    selectedFarm != null
      ? formatCoordinatePair(selectedFarm.latitude, selectedFarm.longitude)
      : "—";
  const sourceLabel = forecast30.data
    ? `${forecast30.data.model_name} · ${forecast30.data.source_name}`
    : "Open-Meteo · pipeline sazonal";

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
      <PageHeader
        title="Inteligência Climática"
        description={`${farmLabel}${farmLocationLabel ? ` · ${farmLocationLabel}` : ""} · ${coordsLabel} · ${sourceLabel}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PipelineStatusBadge />
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading || manualRefresh.isPending || !hasLocation}
            >
              {isLoading || manualRefresh.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Atualizar agora
            </Button>
          </div>
        }
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
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            unit={kpi.unit}
            icon={kpi.icon}
            tone={kpi.tone === "default" ? "muted" : kpi.tone}
          />
        ))}
      </div>

      <SectionCard
        title="Previsão 7 dias"
        subtitle={`${sourceLabel} · GET /pipeline/seasonal-forecast/daily · clima atual via GET /farm-monitoring/observations/latest`}
        className="mb-6"
        action={
          <MetricHint
            hint={METRIC_HINTS.chartClimate}
            label={<span className="text-xs text-muted-foreground">Ajuda</span>}
          />
        }
      >
        {forecast30.isLoading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : weekCards.length === 0 ? (
          <EmptyChart message="Sem previsão diária. Clique em Atualizar agora ou execute POST /pipeline/seasonal-forecast." />
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
            {weekCards.map((day) => {
              const Icon = day.icon;
              return (
                <div
                  key={day.key}
                  className="flex flex-col items-center rounded-lg border border-border bg-surface p-3"
                >
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {day.label}
                  </p>
                  <Icon className="my-3 h-8 w-8 text-primary" aria-hidden />
                  <p className="text-lg font-semibold text-foreground">
                    {day.tempMax != null ? Math.round(day.tempMax) : "—"}°
                    <span className="text-sm text-muted-foreground">
                      {" "}
                      / {day.tempMin != null ? Math.round(day.tempMin) : "—"}°
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{day.condition}</p>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Previsão de Chuva" subtitle="Próximos 30 dias (mm) · pipeline sazonal">
          {forecast30.isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : rainData.length === 0 ? (
            <EmptyChart message="Sem série de chuva prevista para esta coordenada." />
          ) : (
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart data={rainData}>
                  <CartesianGrid stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="d" stroke="#AAB6C4" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#AAB6C4" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip {...chartTooltip} />
                  <Bar dataKey="mm" fill="#6BE234" radius={[4, 4, 0, 0]} name="Chuva (mm)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Previsão de Temperatura" subtitle="Máx / Mín diária (°C) · 30 dias">
          {forecast30.isLoading ? (
            <div className="flex h-60 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : tempData.length === 0 ? (
            <EmptyChart message="Sem série de temperatura prevista para esta coordenada." />
          ) : (
            <div className="h-60">
              <ResponsiveContainer>
                <LineChart data={tempData}>
                  <CartesianGrid stroke="#ffffff10" vertical={false} />
                  <XAxis dataKey="d" stroke="#AAB6C4" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#AAB6C4" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip {...chartTooltip} />
                  <Line type="monotone" dataKey="max" stroke="#FF4D4F" strokeWidth={2} dot={false} name="Máx (°C)" />
                  <Line type="monotone" dataKey="min" stroke="#3FAE2A" strokeWidth={2} dot={false} name="Mín (°C)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Previsão de Risco Climático"
        subtitle={
          hasLlm
            ? `IA · ${prediction?.metadata?.model_name ?? "LLM"}`
            : "Horizonte 30 dias · GET /pipeline/horizon-features"
        }
      >
        {hasLlm && llmInsight ? (
          <div className="flex gap-4 rounded-xl border border-warning/30 bg-warning/5 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
              <Brain className="h-5 w-5" />
            </div>
            <div className="space-y-2 text-sm text-foreground/90">
              <p>{llmInsight.summary}</p>
              <p className="text-muted-foreground">{llmInsight.action}</p>
            </div>
          </div>
        ) : horizonRiskText ? (
          <div className="flex gap-4 rounded-xl border border-warning/30 bg-warning/5 p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
              <CloudRain className="h-5 w-5" />
            </div>
            <div className="space-y-2 text-sm text-foreground/90">
              <p>{horizonRiskText}</p>
              {f30?.projected_total_precip_mm != null && (
                <p className="text-muted-foreground">
                  Chuva projetada no período: {Math.round(f30.projected_total_precip_mm)} mm · dias secos:{" "}
                  {f30.projected_dry_days_ratio != null
                    ? Math.round(f30.projected_dry_days_ratio * 30)
                    : "—"}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Sem análise de risco disponível. Execute o pipeline ou clique em Atualizar agora.
          </div>
        )}
      </SectionCard>
    </>
    </TooltipProvider>
  );
}
