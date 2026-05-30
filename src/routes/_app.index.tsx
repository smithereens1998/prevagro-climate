import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Activity,
  Droplets,
  Sprout,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  Beaker,
  CloudRain,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard, PageHeader, SectionCard } from "@/components/ui-bits";
import { SatelliteMap } from "@/components/SatelliteMap";
import { Button } from "@/components/ui/button";
import { FARM_METRICS } from "@/lib/geo/farm-data";
import {
  aiRecommendations,
  chartTooltip,
  CROP_FOCUS,
  cropProductivityTrend,
  FARM_HECTARES,
  FARM_NAME,
  FARM_MUNICIPIO,
  FARM_SAFRA,
  monthlyClimate,
  monthlyNdvi,
  RISK_SCORE,
} from "@/lib/farm-insights";

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

function Overview() {
  const m = FARM_METRICS;
  const cafe = CROP_FOCUS[0];
  const soja = CROP_FOCUS[1];

  return (
    <>
      <PageHeader
        title="Visão Geral"
        description={`${FARM_NAME} · ${FARM_MUNICIPIO} — café e soja na safra ${FARM_SAFRA}.`}
        action={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            <Sparkles className="h-4 w-4" /> Gerar análise IA
          </Button>
        }
      />

      <SectionCard
        title={`Mapa de Risco — ${FARM_NAME}`}
        subtitle={`Heatmap no perímetro · ${FARM_HECTARES} ha · Patrocínio/MG`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Exportar</Button>
            <Button asChild size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Link to="/mapa">Abrir mapa</Link>
            </Button>
          </div>
        }
        className="mb-6"
      >
        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          <SatelliteMap className="h-[360px]" />
          <div className="flex flex-col gap-3">
            {[
              { label: "Área total", v: String(FARM_HECTARES), u: "ha" },
              { label: "Café", v: String(cafe.areaHa), u: `ha (${cafe.sharePct}%)` },
              { label: "Soja", v: String(soja.areaHa), u: `ha (${soja.sharePct}%) · ${FARM_SAFRA}` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-surface/60 p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
                  {s.v} <span className="text-sm font-normal text-muted-foreground">{s.u}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </SectionCard>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Risco Climático"
          value={String(RISK_SCORE)}
          unit="/100"
          delta={-4}
          icon={AlertTriangle}
          tone="warning"
        />
        <KpiCard
          label="Índice de Vegetação (NDVI)"
          value={m.ndvi.toFixed(2)}
          delta={5}
          icon={Sprout}
          tone="primary"
        />
        <KpiCard
          label="Umidade do Solo"
          value={String(m.umidade)}
          unit="%"
          delta={3}
          icon={Droplets}
          tone="primary"
        />
        <KpiCard
          label="Produtividade Estimada"
          value={m.produtividade.toFixed(1).replace(".", ",")}
          unit="sc/ha"
          delta={8}
          icon={TrendingUp}
          tone="primary"
        />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
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
                <XAxis dataKey="m" stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip {...chartTooltip} />
                <Area type="monotone" dataKey="chuva" stroke="#6BE234" fill="url(#r1)" strokeWidth={2} name="Chuva (mm)" />
                <Area type="monotone" dataKey="temp" stroke="#F4B400" fill="url(#t1)" strokeWidth={2} name="Temp (°C)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Evolução do NDVI" subtitle="Índice de vegetação no perímetro">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={monthlyNdvi}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="m" stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} domain={[0, 1]} />
                <Tooltip {...chartTooltip} />
                <Line type="monotone" dataKey="ndvi" stroke="#6BE234" strokeWidth={2.5} dot={{ fill: "#6BE234", r: 3 }} name="NDVI" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Produtividade por Cultura" subtitle="Café e soja — últimas safras">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={cropProductivityTrend}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="s" stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip {...chartTooltip} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="cafe" stroke="#8B4513" strokeWidth={2} dot={{ r: 3 }} name="Café (sc/ha)" />
                <Line type="monotone" dataKey="soja" stroke="#6BE234" strokeWidth={2} dot={{ r: 3 }} name="Soja (sc/ha)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Recomendações da IA"
        subtitle="Foco em café e soja — dados das últimas 24h"
        action={<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{aiRecommendations.length} ativas</span>}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {aiRecommendations.map((r) => {
            const Icon = recIcons[r.tone];
            const tone =
              r.tone === "primary"
                ? "text-primary bg-primary/10"
                : r.tone === "warning"
                  ? "text-warning bg-warning/10"
                  : "text-destructive bg-destructive/10";
            return (
              <div key={r.title} className="rounded-xl border border-border bg-surface/60 p-4 transition-colors hover:border-primary/30">
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
