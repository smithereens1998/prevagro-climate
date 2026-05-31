import { createFileRoute } from "@tanstack/react-router";
import { KpiCard, PageHeader, SectionCard } from "@/components/ui-bits";
import {
  Droplets,
  FlaskConical,
  Layers,
  Loader2,
  RefreshCw,
  Sprout,
  Thermometer,
} from "lucide-react";
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
import { PipelineStatusBadge } from "@/components/PipelineStatusBadge";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { chartTooltip } from "@/lib/farm-insights";
import {
  buildSoilCompositionBars,
  buildSoloKpis,
  buildSoloSuggestions,
  buildSoilTrendSeries,
} from "@/lib/api/solo-adapters";
import {
  useAgroSoil,
  useCachedLlmPrediction,
  useHorizonFeatures,
  useHorizonFeaturesHistory,
  useLatestMonitoringObservation,
  useRefreshSoilMutation,
} from "@/lib/api/hooks";
import { formatCoordinatePair } from "@/lib/api/normalize";
import { useFarm, useFarmLocation } from "@/lib/farm/farm-context";

export const Route = createFileRoute("/_app/solo")({
  head: () => ({ meta: [{ title: "Solo · Prevagro" }] }),
  component: SoloPage,
});

const kpiIcons = {
  "soil-moisture": Droplets,
  "surface-temp": Thermometer,
  "temp-10cm": Layers,
  "water-stress-30d": Sprout,
} as const;

const suggestionIcons = {
  primary: Sprout,
  warning: FlaskConical,
  danger: Droplets,
} as const;

const formatDistributionTooltipValue = (value: unknown, indicator: string | undefined) => {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  if (indicator === "Umidade" || indicator === "Estresse 30d") {
    return `${Math.round(value)}%`;
  }
  return `${value.toFixed(1).replace(".", ",")}°C`;
};

function SoloPage() {
  const { selectedFarm, farmDisplayName, farmLocationLabel } = useFarm();
  const location = useFarmLocation();
  const hasLocation = location.latitude != null && location.longitude != null;

  const agroSoil = useAgroSoil(location.latitude ?? 0, location.longitude ?? 0, hasLocation);
  const observation = useLatestMonitoringObservation();
  const horizon = useHorizonFeatures();
  const history = useHorizonFeaturesHistory({ limit: 120 });
  const llmCache = useCachedLlmPrediction();
  const refreshSoil = useRefreshSoilMutation();

  const kpis = buildSoloKpis(observation.data, agroSoil.data, horizon.data);
  const compositionBars = buildSoilCompositionBars(observation.data, agroSoil.data, horizon.data);
  const trendSeries = buildSoilTrendSeries(history.data);
  const suggestions = buildSoloSuggestions(llmCache.data, observation.data, horizon.data);

  const isLoading =
    agroSoil.isLoading || observation.isLoading || horizon.isLoading || history.isLoading;
  const farmLabel = farmDisplayName || selectedFarm?.name || "Fazenda";
  const coordsLabel =
    selectedFarm != null
      ? formatCoordinatePair(selectedFarm.latitude, selectedFarm.longitude)
      : "—";

  const handleRefreshSoil = () => {
    refreshSoil.mutate(undefined, {
      onSuccess: () => {
        void agroSoil.refetch();
        void observation.refetch();
      },
    });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <>
        <PageHeader
          title="Inteligência de Solo"
          description={`${farmLabel}${farmLocationLabel ? ` · ${farmLocationLabel}` : ""} · ${coordsLabel}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              <PipelineStatusBadge />
              <Button
                variant="outline"
                onClick={handleRefreshSoil}
                disabled={!hasLocation || isLoading || refreshSoil.isPending}
              >
                {isLoading || refreshSoil.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Atualizar solo
              </Button>
            </div>
          }
        />

        {(agroSoil.isError || observation.isError || horizon.isError || history.isError) && (
          <p className="mb-4 text-sm text-warning" role="status">
            Alguns dados de solo não carregaram. Verifique backend e coordenada ativa da fazenda.
          </p>
        )}

        {refreshSoil.isError && (
          <p className="mb-4 text-sm text-warning" role="status">
            Não foi possível atualizar o solo agora. Tente novamente em instantes.
          </p>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => {
            const Icon = kpiIcons[kpi.id as keyof typeof kpiIcons] ?? FlaskConical;
            return (
              <KpiCard
                key={kpi.id}
                label={kpi.label}
                value={kpi.value}
                unit={kpi.unit}
                icon={Icon}
                tone={kpi.tone}
              />
            );
          })}
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <SectionCard
            title="Observação mais recente"
            subtitle="Persistido no monitoramento da fazenda"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground">Umidade registrada</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {observation.data?.soil?.moisture != null
                    ? `${Math.round(observation.data.soil.moisture * 100)}%`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground">Temp. superfície (t0)</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {observation.data?.soil?.temp_surface_celsius != null
                    ? `${observation.data.soil.temp_surface_celsius.toFixed(1).replace(".", ",")}°C`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground">Temp. solo 10cm</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {agroSoil.data?.temperature_celsius?.t10_celsius != null
                    ? `${agroSoil.data.temperature_celsius.t10_celsius.toFixed(1).replace(".", ",")}°C`
                    : "—"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-surface p-3">
                <p className="text-xs text-muted-foreground">Observado em</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {observation.data?.observed_at
                    ? new Date(observation.data.observed_at).toLocaleString("pt-BR")
                    : "—"}
                </p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Distribuição dos Indicadores" subtitle="Leitura atual por variável">
            <div className="h-60">
              <ResponsiveContainer>
                <BarChart data={compositionBars} layout="vertical">
                  <CartesianGrid stroke="#ffffff10" horizontal={false} />
                  <XAxis
                    type="number"
                    stroke="#AAB6C4"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="n"
                    stroke="#AAB6C4"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    {...chartTooltip}
                    formatter={(value, _name, item) => {
                      const indicator =
                        typeof item?.payload?.n === "string" ? item.payload.n : undefined;
                      return [
                        formatDistributionTooltipValue(value, indicator),
                        indicator ?? "Indicador",
                      ];
                    }}
                    labelFormatter={(label, payload) => {
                      const indicator =
                        payload?.[0] && "payload" in payload[0]
                          ? (payload[0].payload as { n?: string }).n
                          : undefined;
                      return indicator ?? String(label ?? "");
                    }}
                  />
                  <Bar dataKey="v" fill="#6BE234" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>
        </div>

        <SectionCard
          title="Tendência de Umidade de Base"
          subtitle="Série histórica derivada de GET /pipeline/horizon-features/history"
          className="mb-6"
        >
          <div className="h-56">
            {history.isLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : trendSeries.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-surface/40 px-4 text-center text-sm text-muted-foreground">
                Sem histórico suficiente para tendência de solo.
              </div>
            ) : (
              <ResponsiveContainer>
                <LineChart data={trendSeries}>
                  <CartesianGrid stroke="#ffffff10" vertical={false} />
                  <XAxis
                    dataKey="m"
                    stroke="#AAB6C4"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip {...chartTooltip} />
                  <Line
                    type="monotone"
                    dataKey="q"
                    stroke="#6BE234"
                    strokeWidth={2.5}
                    dot={{ fill: "#6BE234", r: 3 }}
                    name="Umidade base (%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Sugestões da IA para Solo">
          <div className="grid gap-3 md:grid-cols-3">
            {suggestions.map((suggestion) => {
              const Icon = suggestionIcons[suggestion.severity];
              return (
                <div
                  key={suggestion.title}
                  className="rounded-xl border border-primary/20 bg-primary/5 p-4"
                >
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">{suggestion.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {suggestion.description}
                  </p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            Baseado no monitoramento de solo e contexto de risco 30 dias
          </div>
        </SectionCard>
      </>
    </TooltipProvider>
  );
}
