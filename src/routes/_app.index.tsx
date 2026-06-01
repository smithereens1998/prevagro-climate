import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Droplets,
  Sprout,
  AlertTriangle,
  Thermometer,
  Mountain,
  Loader2,
} from "lucide-react";
import { SectionCard } from "@/components/ui-bits";
import { FarmSelector } from "@/components/farm/FarmSelector";
import { FarmMapPreview } from "@/components/FarmMapPreview";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MetricHint } from "@/components/overview/MetricHint";
import { OverviewFarmHero } from "@/components/overview/OverviewFarmHero";
import { SemanticKpiCard } from "@/components/overview/SemanticKpiCard";
import { OverviewTimeSeriesChart } from "@/components/overview/OverviewTimeSeriesChart";
import { AiDiagnosisCard } from "@/components/overview/AiDiagnosisCard";
import { type OverviewKpiId } from "@/lib/farm-insights";
import {
  buildForecast30Metrics,
  buildOverviewKpisFromApi,
  seasonalForecastToClimateSeries,
  seasonalForecastToRiskSeries,
  satelliteToNdviSeries,
} from "@/lib/api/overview-adapters";
import { horizonToRiskScore, llmToRecommendations, llmToStrategicInsight } from "@/lib/api/adapters";
import {
  useAgroSoil,
  useAgroWeather,
  useCachedLlmPrediction,
  useHorizonFeatures,
  useLlmPredictionMutation,
  useSatelliteHistory,
  useSeasonalForecastDaily,
} from "@/lib/api/hooks";
import { METRIC_HINTS, riskBandLabel } from "@/lib/overview/metric-hints";
import { getForecastMetricVisual, getKpiVisual } from "@/lib/overview/metric-visuals";
import { useFarm, useFarmLocation } from "@/lib/farm/farm-context";
import { useActivePolygon } from "@/lib/farm/use-active-polygon";
import { formatCoordinatePair } from "@/lib/api/normalize";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · Prevagro" },
      { name: "description", content: "Monitoramento climático e operacional da fazenda." },
    ],
  }),
  component: Overview,
});

const kpiIcons: Record<OverviewKpiId, typeof Sprout> = {
  risco: AlertTriangle,
  ndvi: Sprout,
  umidade: Droplets,
  temp: Thermometer,
  solo: Mountain,
};

const kpiHints: Partial<Record<OverviewKpiId, keyof typeof METRIC_HINTS>> = {
  risco: "riskScore",
  ndvi: "ndviStress",
  umidade: "humidity",
  solo: "soilMoisture",
};

function Overview() {
  const { selectedFarm, farmDisplayName, farmLocationLabel, refetchFarmIdentity } = useFarm();
  const location = useFarmLocation();
  const activePolygon = useActivePolygon();
  const hasLocation = location.latitude != null && location.longitude != null;

  const horizon = useHorizonFeatures();
  const forecast30 = useSeasonalForecastDaily(30);
  const satellite = useSatelliteHistory(activePolygon.polygonId);
  const weather = useAgroWeather(location.latitude ?? 0, location.longitude ?? 0, hasLocation);
  const soil = useAgroSoil(location.latitude ?? 0, location.longitude ?? 0, hasLocation);
  const llmCache = useCachedLlmPrediction();
  const llmMutation = useLlmPredictionMutation();

  const apiRisk = horizon.isSuccess ? horizonToRiskScore(horizon.data) : null;
  const prediction = llmMutation.data ?? llmCache.data;
  const hasLlm = Boolean(prediction?.diagnostico?.resumo);
  const insight = hasLlm ? llmToStrategicInsight(prediction) : null;
  const recommendations = hasLlm ? llmToRecommendations(prediction) : [];
  const kpis = buildOverviewKpisFromApi(horizon.data, weather.data, soil.data);
  const climateSeries = forecast30.data?.forecast
    ? seasonalForecastToClimateSeries(forecast30.data.forecast)
    : [];
  const riskSeries = forecast30.data?.forecast
    ? seasonalForecastToRiskSeries(forecast30.data.forecast)
    : [];
  const ndviSeries = satellite.data ? satelliteToNdviSeries(satellite.data) : [];
  const forecastMetrics = buildForecast30Metrics(forecast30.data);
  const riskBand = riskBandLabel(apiRisk);
  const isLoadingCore =
    horizon.isLoading ||
    forecast30.isLoading ||
    weather.isLoading ||
    soil.isLoading ||
    activePolygon.isLoading;

  const handleGenerateAnalysis = () => {
    llmMutation.mutate();
  };

  const handleRefresh = () => {
    void horizon.refetch();
    void forecast30.refetch();
    void weather.refetch();
    void soil.refetch();
    activePolygon.refetch();
    void satellite.refetch();
    refetchFarmIdentity();
  };

  const farmLabel = selectedFarm?.name || farmDisplayName || activePolygon.polygon?.name || "Fazenda";
  const areaLabel = activePolygon.areaHa != null ? `${activePolygon.areaHa} ha` : null;
  const coordsLabel =
    selectedFarm != null
      ? formatCoordinatePair(selectedFarm.latitude, selectedFarm.longitude)
      : "—";

  const locationParts = [farmLocationLabel, areaLabel].filter(Boolean);
  const locationLine = locationParts.length > 0 ? locationParts.join(" · ") : "Localização não informada";
  const coordsLine = coordsLabel !== "—" ? coordsLabel : "Coordenadas indisponíveis";

  const updatedLabel = horizon.dataUpdatedAt
    ? new Date(horizon.dataUpdatedAt).toLocaleString("pt-BR")
    : "aguardando dados";

  return (
    <TooltipProvider delayDuration={200}>
      <>
        <OverviewFarmHero
          farmName={farmLabel}
          locationLine={locationLine}
          coordsLine={coordsLine}
          updatedAt={updatedLabel}
          isLoading={isLoadingCore}
          isGenerating={llmMutation.isPending}
          canGenerate={hasLocation}
          onRefresh={handleRefresh}
          onGenerate={handleGenerateAnalysis}
        />

        {(horizon.isError || forecast30.isError || weather.isError || soil.isError) && (
          <p className="mb-4 text-sm text-warning" role="status">
            Alguns dados da API não carregaram. Verifique se o backend está rodando e se o pipeline já foi
            executado para esta fazenda.
          </p>
        )}

        {llmMutation.isError && (
          <p className="mb-4 text-sm text-warning" role="status">
            Não foi possível gerar análise via API. Tente novamente após executar o pipeline diário.
          </p>
        )}

        <SectionCard
          title="Mapa de risco"
          subtitle="Visualização do perímetro e score agregado"
          action={
            <div className="flex flex-wrap gap-2">
              <FarmSelector variant="outline-button" />
              <Button asChild size="sm">
                <Link to="/mapa">Abrir mapa</Link>
              </Button>
            </div>
          }
          className="mb-6"
        >
          <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
            <FarmMapPreview
              className="min-h-[320px] h-[420px]"
              riskScore={apiRisk}
              feature={activePolygon.feature}
              bounds={activePolygon.bounds}
              maxBounds={activePolygon.maxBounds}
              farmLabel={farmLabel}
              areaHa={activePolygon.areaHa}
              isLoading={activePolygon.isLoading}
            />
            <div className="flex flex-col gap-3">
              <div className="rounded-xl border border-border bg-surface/80 p-4">
                <MetricHint
                  hint={METRIC_HINTS.chartClimate}
                  label={
                    <span className="text-xs font-medium text-muted-foreground">
                      Previsão 30 dias
                    </span>
                  }
                  className="text-xs font-medium text-muted-foreground"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {forecast30.data?.model_name ?? "Open-Meteo"} ·{" "}
                  {forecast30.data?.source_name ?? "pipeline sazonal"}
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  {forecastMetrics.map((metric) => {
                    const hintKey =
                      metric.key === "temp"
                        ? "forecastTemp"
                        : metric.key === "rain"
                          ? "forecastRain"
                          : "forecastDryDays";
                    const visual = getForecastMetricVisual(metric);
                    return (
                      <div
                        key={metric.key}
                        className={cn(
                          "rounded-lg border border-border border-l-4 p-2",
                          visual.borderClass,
                          visual.bgClass,
                        )}
                      >
                        <MetricHint
                          hint={METRIC_HINTS[hintKey]}
                          label={<span className="text-muted-foreground">{metric.label}</span>}
                          className="text-muted-foreground"
                          iconClassName="h-3 w-3"
                        />
                        <p className={cn("text-lg font-semibold", visual.valueClass)}>{metric.value}</p>
                        {metric.value !== "—" && (
                          <span
                            className={cn(
                              "mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[9px] font-medium uppercase",
                              visual.badgeClass,
                            )}
                          >
                            {visual.label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {forecast30.isError && (
                  <p className="mt-2 text-[11px] text-warning">
                    Sem previsão diária. Execute POST /pipeline/seasonal-forecast.
                  </p>
                )}
                {forecast30.isSuccess && forecast30.data.summary.samples === 0 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Nenhum dia previsto no banco para esta coordenada.
                  </p>
                )}
              </div>
              <div className="rounded-xl border border-border bg-surface/80 p-4">
                <MetricHint
                  hint={METRIC_HINTS.currentWeather}
                  label={
                    <span className="text-xs font-medium text-muted-foreground">
                      Condições atuais (AgroMonitoring)
                    </span>
                  }
                  className="text-xs font-medium text-muted-foreground"
                />
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">Temperatura</p>
                    <p className="text-lg font-semibold text-foreground">
                      {weather.data?.main?.temp_celsius != null
                        ? `${weather.data.main.temp_celsius.toFixed(1).replace(".", ",")}°C`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Umidade ar</p>
                    <p className="text-lg font-semibold text-foreground">
                      {weather.data?.main?.humidity != null
                        ? `${Math.round(weather.data.main.humidity)}%`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Solo (t0)</p>
                    <p className="text-lg font-semibold text-foreground">
                      {soil.data?.temperature_celsius?.t0_celsius != null
                        ? `${soil.data.temperature_celsius.t0_celsius.toFixed(1).replace(".", ",")}°C`
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Umidade solo</p>
                    <p className="text-lg font-semibold text-foreground">
                      {soil.data?.moisture != null
                        ? `${Math.round(soil.data.moisture * 100)}%`
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {kpis.map((k) => {
            const hintKey = kpiHints[k.id];
            const visual = getKpiVisual(k.id, k.value);
            return (
              <SemanticKpiCard
                key={k.id}
                label={
                  hintKey ? (
                    <MetricHint
                      hint={METRIC_HINTS[hintKey]}
                      label={k.label}
                      className="text-sm text-muted-foreground"
                    />
                  ) : (
                    k.label
                  )
                }
                value={k.value}
                unit={k.unit}
                delta={k.delta}
                icon={kpiIcons[k.id]}
                visual={visual}
              />
            );
          })}
        </div>

        {apiRisk != null && riskBand && (
          <p className="mb-4 text-xs text-muted-foreground">
            Risco agregado da fazenda:{" "}
            <span
              className={cn(
                "font-semibold",
                riskBand.tone === "primary" && "text-primary",
                riskBand.tone === "warning" && "text-warning",
                riskBand.tone === "destructive" && "text-destructive",
              )}
            >
              {apiRisk}/100 · {riskBand.text}
            </span>
            {" · "}
            <MetricHint
              hint={METRIC_HINTS.riskScore}
              label={<span>como é calculado</span>}
              className="inline text-xs text-muted-foreground underline-offset-2 hover:underline"
              iconClassName="h-3 w-3"
            />
          </p>
        )}

        <SectionCard
          title="Séries temporais"
          subtitle="Previsão 30 dias, risco derivado e NDVI satelital"
          className="mb-6"
        >
          <OverviewTimeSeriesChart
            climateSeries={climateSeries}
            riskSeries={riskSeries}
            ndviSeries={ndviSeries}
            isClimateLoading={forecast30.isLoading}
            isRiskLoading={forecast30.isLoading}
            isNdviLoading={satellite.isLoading}
            hints={{
              climate: METRIC_HINTS.chartClimate,
              risk: METRIC_HINTS.chartRisk,
              ndvi: METRIC_HINTS.chartNdvi,
            }}
          />
        </SectionCard>

        <SectionCard
          title="Diagnóstico"
          subtitle="Análise inteligente e ações recomendadas"
          className="mb-6"
        >
          <AiDiagnosisCard
            hasLlm={hasLlm}
            prediction={prediction}
            insight={insight}
            recommendations={recommendations}
            onGenerate={handleGenerateAnalysis}
            isGenerating={llmMutation.isPending}
          />
        </SectionCard>
      </>
    </TooltipProvider>
  );
}
