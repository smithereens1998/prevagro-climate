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
import { cn } from "@/lib/utils";
import {
  chartTooltip,
  CROP_FOCUS,
  FARM_HECTARES,
  FARM_NAME,
  FARM_MUNICIPIO,
  FARM_SAFRA,
  FARM_SNAPSHOT,
  monthlyClimate,
  monthlyNdvi,
  type OverviewKpiId,
} from "@/lib/farm-insights";
import {
  getDefaultOverviewKpis,
  horizonToRiskScore,
  llmToRecommendations,
  llmToStrategicInsight,
  mergeOverviewKpis,
} from "@/lib/api/adapters";
import {
  useAgroWeather,
  useCachedLlmPrediction,
  useFarmLocation,
  useHorizonFeatures,
  useLlmPredictionMutation,
} from "@/lib/api/hooks";

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

const cropStatusClass = {
  ok: "bg-primary/15 text-primary",
  warn: "bg-warning/15 text-warning",
  done: "bg-muted text-muted-foreground",
  new: "bg-secondary/20 text-secondary",
} as const;

function Overview() {
  const location = useFarmLocation();
  const horizon = useHorizonFeatures();
  const weather = useAgroWeather(location.latitude!, location.longitude!);
  const llmCache = useCachedLlmPrediction();
  const llmMutation = useLlmPredictionMutation();

  const prediction = llmMutation.data ?? llmCache.data;
  const riskScore = horizon.isSuccess ? horizonToRiskScore(horizon.data) : null;
  const kpis = mergeOverviewKpis(
    getDefaultOverviewKpis(),
    riskScore,
    weather.isSuccess ? weather.data : undefined,
  );
  const insight = llmToStrategicInsight(prediction);
  const recommendations = llmToRecommendations(prediction);
  const usingApi = horizon.isSuccess || weather.isSuccess || Boolean(prediction);
  const updatedLabel = usingApi
    ? "dados da API (com fallback local se necessário)"
    : `dados locais · ${FARM_SNAPSHOT.updatedAt}`;

  const handleGenerateAnalysis = () => {
    llmMutation.mutate();
  };

  return (
    <>
      <PageHeader
        title="Visão Geral"
        description={`${FARM_NAME} · ${FARM_MUNICIPIO} — café e soja na safra ${FARM_SAFRA}. Atualizado: ${updatedLabel}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <PipelineStatusBadge />
            <Button onClick={handleGenerateAnalysis} disabled={llmMutation.isPending}>
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

      {llmMutation.isError && (
        <p className="mb-4 text-sm text-warning" role="status">
          Não foi possível gerar análise via API — exibindo recomendações locais.
        </p>
      )}

      <SectionCard
        title={`Mapa de Risco — ${FARM_NAME}`}
        subtitle={`Mapbox GL · heatmap nativo · ${FARM_HECTARES} ha · Patrocínio/MG`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              Exportar
            </Button>
            <Button asChild size="sm">
              <Link to="/mapa">Abrir mapa</Link>
            </Button>
          </div>
        }
        className="mb-6"
      >
        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          <FarmMapPreview className="h-[360px]" />
          <div className="flex flex-col gap-3">
            {CROP_FOCUS.map((c) => (
              <div key={c.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">{c.name}</p>
                    <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                      {c.areaHa}{" "}
                      <span className="text-sm font-normal text-muted-foreground">
                        ha ({c.sharePct}%)
                      </span>
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-medium",
                      cropStatusClass[c.status],
                    )}
                  >
                    {c.stage}
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">NDVI</dt>
                    <dd className="font-medium text-foreground">{c.ndvi.toFixed(2)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Estágio</dt>
                    <dd className="font-medium text-foreground">{c.stage}</dd>
                  </div>
                </dl>
              </div>
            ))}
            <div className="rounded-lg border border-border bg-surface p-4">
              <p className="text-xs text-muted-foreground">
                Hidrologia ({FARM_SNAPSHOT.windowDays} dias)
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {FARM_SNAPSHOT.chuvaAcumuladaMm}
                  </p>
                  <p className="text-muted-foreground">mm chuva</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {FARM_SNAPSHOT.evapotranspiracaoMm}
                  </p>
                  <p className="text-muted-foreground">mm ET₀</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-warning">
                    {FARM_SNAPSHOT.deficitHidricoMm}
                  </p>
                  <p className="text-muted-foreground">mm déficit</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <KpiCard
            key={k.id}
            label={k.label}
            value={k.value}
            unit={k.unit}
            delta={k.delta}
            icon={kpiIcons[k.id]}
            tone={kpiTones[k.id]}
          />
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Histórico Climático" subtitle="Temperatura e chuva — 12 meses">
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={monthlyClimate}>
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
                <XAxis
                  dataKey="m"
                  stroke="#AAB6C4"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
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
        </SectionCard>

        <SectionCard title="Evolução do NDVI" subtitle="Índice de vegetação no perímetro">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={monthlyNdvi}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis
                  dataKey="m"
                  stroke="#AAB6C4"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#AAB6C4"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 1]}
                />
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
        </SectionCard>
      </div>

      <SectionCard
        title="Insight Estratégico"
        subtitle={
          prediction?.metadata?.prediction_id
            ? `IA · prediction #${prediction.metadata.prediction_id} · ${prediction.metadata.prompt_version ?? "v1"}`
            : `Síntese · janela de ${FARM_SNAPSHOT.windowDays} dias`
        }
        className="mb-6"
      >
        <div className="flex gap-4 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
            <Brain className="h-4 w-4" />
          </div>
          <div className="space-y-2 text-sm leading-relaxed text-foreground">
            <p>{insight.summary}</p>
            <p className="text-muted-foreground">{insight.action}</p>
            <div className="flex flex-wrap gap-2 pt-1">
              {insight.tags.map((t) => (
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
      </SectionCard>

      <SectionCard
        title="Recomendações da IA"
        subtitle={
          usingApi && prediction?.acoes_recomendadas?.length
            ? "Derivadas da API /llm/predictions"
            : "Fallback local quando a API não responde"
        }
        action={
          <span className="rounded-md border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            {recommendations.length} ativas
          </span>
        }
      >
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
      </SectionCard>
    </>
  );
}
