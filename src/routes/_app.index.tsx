import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Droplets,
  Sprout,
  AlertTriangle,
  Beaker,
  CloudRain,
  Thermometer,
  Mountain,
  Brain,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard, PageHeader, SectionCard } from "@/components/ui-bits";
import { FarmMapPreview } from "@/components/FarmMapPreview";
import { PipelineStatusBadge } from "@/components/PipelineStatusBadge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MetricHint } from "@/components/overview/MetricHint";
import { chartTooltip, type OverviewKpiId } from "@/lib/farm-insights";
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
import { useFarm, useFarmLocation } from "@/lib/farm/farm-context";
import { useActivePolygon } from "@/lib/farm/use-active-polygon";
import { formatCoordinatePair } from "@/lib/api/normalize";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · Prevagro" },
      { name: "description", content: "Inteligência climática com IA para sua fazenda." },
    ],
  }),
  component: Overview,
});

const recIcons = {
  primary: Droplets,
  warning: Beaker,
  danger: CloudRain,
} as const;

const kpiIcons: Record<OverviewKpiId, typeof Sprout> = {
  risco: AlertTriangle,
  ndvi: Sprout,
  umidade: Droplets,
  temp: Thermometer,
  solo: Mountain,
};

const kpiTones: Record<OverviewKpiId, "primary" | "warning" | "muted"> = {
  risco: "warning",
  ndvi: "primary",
  umidade: "primary",
  temp: "muted",
  solo: "muted",
};

const kpiHints: Partial<Record<OverviewKpiId, keyof typeof METRIC_HINTS>> = {
  risco: "riskScore",
  ndvi: "ndviStress",
  umidade: "humidity",
  solo: "soilMoisture",
};

const metricToneClass = {
  default: "text-foreground",
  warning: "text-warning",
  primary: "text-primary",
  destructive: "text-destructive",
} as const;

const EmptyChart = ({ message }: { message: string }) => (
  <div className="flex h-56 items-center justify-center rounded-lg border border-dashed border-border bg-surface/40 px-4 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

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

  const farmLabel = farmDisplayName || activePolygon.polygon?.name || "Fazenda";
  const areaLabel = activePolygon.areaHa != null ? `${activePolygon.areaHa} ha` : null;
  const locationLabel = farmLocationLabel ? ` · ${farmLocationLabel}` : "";
  const coordsLabel =
    selectedFarm != null
      ? formatCoordinatePair(selectedFarm.latitude, selectedFarm.longitude)
      : "—";

  const updatedLabel = horizon.dataUpdatedAt
    ? new Date(horizon.dataUpdatedAt).toLocaleString("pt-BR")
    : "aguardando dados";

  return (
    <TooltipProvider delayDuration={200}>
    <>
      <PageHeader
        title="Visão Geral"
        description={`${farmLabel}${locationLabel}${areaLabel ? ` · ${areaLabel}` : ""} · ${coordsLabel} — dados da API. Atualizado: ${updatedLabel}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PipelineStatusBadge />
            <Button variant="outline" onClick={handleRefresh} disabled={isLoadingCore}>
              {isLoadingCore ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Atualizar
            </Button>
            <Button onClick={handleGenerateAnalysis} disabled={llmMutation.isPending || !hasLocation}>
              {llmMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Brain className="h-4 w-4" />
              )}
              Gerar análise
            </Button>
          </div>
        }
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
        title={`Mapa de Risco — ${farmLabel}`}
        subtitle={
          areaLabel
            ? `${areaLabel} · coordenadas ${coordsLabel}`
            : `Coordenadas ativas · ${coordsLabel}`
        }
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/fazendas">Trocar fazenda</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/mapa">Abrir mapa</Link>
            </Button>
          </div>
        }
        className="mb-6"
      >
        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          <FarmMapPreview
            className="h-[360px]"
            riskScore={apiRisk}
            feature={activePolygon.feature}
            bounds={activePolygon.bounds}
            maxBounds={activePolygon.maxBounds}
            farmLabel={farmLabel}
            areaHa={activePolygon.areaHa}
            isLoading={activePolygon.isLoading}
          />
          <div className="flex flex-col gap-3">
            <div className="rounded-lg border border-border bg-surface p-4">
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
                  return (
                    <div key={metric.key}>
                      <MetricHint
                        hint={METRIC_HINTS[hintKey]}
                        label={<span className="text-muted-foreground">{metric.label}</span>}
                        className="text-muted-foreground"
                        iconClassName="h-3 w-3"
                      />
                      <p className={cn("text-lg font-semibold", metricToneClass[metric.tone])}>
                        {metric.value}
                      </p>
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
            <div className="rounded-lg border border-border bg-surface p-4">
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
          return (
            <KpiCard
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
              tone={kpiTones[k.id]}
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
            label={<span>o que significa?</span>}
            className="inline text-xs text-primary"
            iconClassName="h-3 w-3"
          />
        </p>
      )}

      <SectionCard
        title="Séries temporais"
        subtitle="Previsão 30 dias, risco derivado e NDVI satelital"
        className="mb-6"
      >
        <Tabs defaultValue="clima" className="w-full">
          <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1">
            <TabsTrigger value="clima">Projeção climática</TabsTrigger>
            <TabsTrigger value="risco">Evolução de risco</TabsTrigger>
            <TabsTrigger value="ndvi">NDVI satelital</TabsTrigger>
          </TabsList>

          <TabsContent value="clima" className="mt-0">
            <div className="mb-3">
              <MetricHint
                hint={METRIC_HINTS.chartClimate}
                label={<span className="text-sm font-medium text-foreground">Próximos 30 dias</span>}
              />
            </div>
            {forecast30.isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : climateSeries.length === 0 ? (
              <EmptyChart message="Sem previsão diária. Execute POST /pipeline/seasonal-forecast ou /pipeline/daily-full." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart data={climateSeries}>
                    <defs>
                      <linearGradient id="t1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#F4B400" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#F4B400" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="r1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6BE234" stopOpacity={0.5} />
                        <stop offset="100%" stopColor="#6BE234" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="m" stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip {...chartTooltip} />
                    <Area
                      type="monotone"
                      dataKey="chuva"
                      stroke="#6BE234"
                      fill="url(#r1)"
                      strokeWidth={2}
                      name="Chuva (mm)"
                    />
                    <Area
                      type="monotone"
                      dataKey="temp"
                      stroke="#F4B400"
                      fill="url(#t1)"
                      strokeWidth={2}
                      name="Temp (°C)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="risco" className="mt-0">
            <div className="mb-3">
              <MetricHint
                hint={METRIC_HINTS.chartRisk}
                label={<span className="text-sm font-medium text-foreground">Risco diário estimado</span>}
              />
            </div>
            {forecast30.isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : riskSeries.length === 0 ? (
              <EmptyChart message="Sem série de risco. É necessária a previsão de 30 dias no pipeline." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={riskSeries}>
                    <CartesianGrid stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="m" stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip {...chartTooltip} />
                    <Line
                      type="monotone"
                      dataKey="calor"
                      stroke="#F4B400"
                      strokeWidth={2.5}
                      dot={{ fill: "#F4B400", r: 3 }}
                      name="Risco calor (/100)"
                    />
                    <Line
                      type="monotone"
                      dataKey="agua"
                      stroke="#6BE234"
                      strokeWidth={2.5}
                      dot={{ fill: "#6BE234", r: 3 }}
                      name="Estresse hídrico (/100)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>

          <TabsContent value="ndvi" className="mt-0">
            <div className="mb-3">
              <MetricHint
                hint={METRIC_HINTS.chartNdvi}
                label={<span className="text-sm font-medium text-foreground">Últimos 90 dias</span>}
              />
            </div>
            {satellite.isLoading ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : ndviSeries.length === 0 ? (
              <EmptyChart message="Sem histórico NDVI. Vincule um polígono AgroMonitoring à fazenda." />
            ) : (
              <div className="h-64">
                <ResponsiveContainer>
                  <LineChart data={ndviSeries}>
                    <CartesianGrid stroke="#ffffff10" vertical={false} />
                    <XAxis dataKey="m" stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} domain={[0, 1]} />
                    <Tooltip {...chartTooltip} />
                    <Line
                      type="monotone"
                      dataKey="ndvi"
                      stroke="#6BE234"
                      strokeWidth={2.5}
                      dot={{ fill: "#6BE234", r: 3 }}
                      name="NDVI"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SectionCard>

      <SectionCard
        title="Insight Estratégico"
        subtitle={
          prediction?.metadata?.prediction_id
            ? `IA · prediction #${prediction.metadata.prediction_id} · ${prediction.metadata.prompt_version ?? "v1"}`
            : "Gere uma análise com IA para esta fazenda"
        }
        className="mb-6"
      >
        {!hasLlm ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Nenhuma análise LLM disponível. Clique em &quot;Gerar análise&quot; ou execute o pipeline diário
            completo no backend.
          </div>
        ) : (
          <div className="flex gap-4 rounded-lg border border-border bg-muted/30 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
              <Brain className="h-4 w-4" />
            </div>
            <div className="space-y-2 text-sm leading-relaxed text-foreground">
              <p>{insight?.summary}</p>
              <p className="text-muted-foreground">{insight?.action}</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {insight?.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-md border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Recomendações da IA"
        subtitle={
          hasLlm && prediction?.acoes_recomendadas?.length
            ? "Derivadas de /llm/predictions"
            : "Disponível após gerar análise"
        }
        action={
          <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {recommendations.length} ativas
          </span>
        }
      >
        {!hasLlm || recommendations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-sm text-muted-foreground">
            Sem recomendações até que a IA processe os dados monitorados desta fazenda.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {recommendations.map((r) => {
              const Icon = recIcons[r.tone];
              const tone =
                r.tone === "primary"
                  ? "text-primary bg-primary/10"
                  : r.tone === "warning"
                    ? "text-warning bg-warning/10"
                    : "text-destructive bg-destructive/10";
              return (
                <div key={r.title} className="rounded-lg border border-border bg-surface p-4">
                  <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{r.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                  <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                    <Activity className="h-3 w-3" /> Aplicar recomendação
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </>
    </TooltipProvider>
  );
}
