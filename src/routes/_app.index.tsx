import { createFileRoute } from "@tanstack/react-router";
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

export const Route = createFileRoute("/_app/")({
  head: () => ({
    meta: [
      { title: "Visão Geral · Prevagro" },
      { name: "description", content: "Inteligência climática com IA para sua fazenda." },
    ],
  }),
  component: Overview,
});

const climaData = Array.from({ length: 12 }).map((_, i) => ({
  m: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i],
  temp: 20 + Math.sin(i / 2) * 6 + Math.random() * 2,
  chuva: 60 + Math.cos(i / 2) * 50 + Math.random() * 20,
}));
const ndviData = Array.from({ length: 12 }).map((_, i) => ({
  m: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i],
  ndvi: 0.4 + Math.sin(i / 2.4) * 0.25 + 0.1,
}));
const prodData = Array.from({ length: 6 }).map((_, i) => ({
  s: `Safra ${i + 1}`,
  v: 50 + i * 5 + Math.random() * 8,
}));

const chartTooltip = {
  contentStyle: {
    background: "oklch(0.244 0.026 240)",
    border: "1px solid oklch(1 0 0 / 0.08)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 12,
  },
  cursor: { stroke: "#6BE234", strokeOpacity: 0.3 },
};

function Overview() {
  return (
    <>
      <PageHeader
        title="Visão Geral"
        description="Monitore o clima, solo e cultivos com inteligência artificial."
        action={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            <Sparkles className="h-4 w-4" /> Gerar análise IA
          </Button>
        }
      />

      {/* Hero map */}
      <SectionCard
        title="Mapa de Risco — Fazenda São João"
        subtitle="Heatmap em tempo real · atualizado há 4 min"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm">Exportar</Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Abrir mapa</Button>
          </div>
        }
        className="mb-6"
      >
        <div className="grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          <SatelliteMap className="h-[360px]" />
          <div className="flex flex-col gap-3">
            {[
              { label: "Área total", v: "1.248", u: "ha" },
              { label: "Área analisada", v: "1.106", u: "ha (88%)" },
              { label: "Cultura principal", v: "Soja", u: "Safra 24/25" },
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

      {/* KPIs */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Risco Climático" value="34" unit="/100" delta={-12} icon={AlertTriangle} tone="warning" />
        <KpiCard label="Índice de Vegetação (NDVI)" value="0.72" delta={5} icon={Sprout} tone="primary" />
        <KpiCard label="Umidade do Solo" value="62" unit="%" delta={3} icon={Droplets} tone="primary" />
        <KpiCard label="Produtividade Estimada" value="78,4" unit="sc/ha" delta={8} icon={TrendingUp} tone="primary" />
      </div>

      {/* Charts */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <SectionCard title="Histórico Climático" subtitle="Temperatura e chuva — 12 meses">
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={climaData}>
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
                <Area type="monotone" dataKey="chuva" stroke="#6BE234" fill="url(#r1)" strokeWidth={2} />
                <Area type="monotone" dataKey="temp" stroke="#F4B400" fill="url(#t1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Evolução do NDVI" subtitle="Índice de vegetação por mês">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={ndviData}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="m" stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} domain={[0, 1]} />
                <Tooltip {...chartTooltip} />
                <Line type="monotone" dataKey="ndvi" stroke="#6BE234" strokeWidth={2.5} dot={{ fill: "#6BE234", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Tendência de Produtividade" subtitle="Sacas / hectare por safra">
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={prodData}>
                <defs>
                  <linearGradient id="p1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3FAE2A" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#3FAE2A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="s" stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip {...chartTooltip} />
                <Area type="monotone" dataKey="v" stroke="#3FAE2A" fill="url(#p1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* AI Recommendations */}
      <SectionCard
        title="Recomendações da IA"
        subtitle="Sugestões geradas a partir dos seus dados nas últimas 24h"
        action={<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">3 novas</span>}
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
            {
              icon: Droplets,
              title: "Aumentar irrigação",
              desc: "Talhão 04 com umidade 12% abaixo do ideal. Recomendado +18 mm em 48h.",
              tone: "primary" as const,
            },
            {
              icon: Beaker,
              title: "Aplicar potássio",
              desc: "Análise de solo indica deficiência de K em 23% da área leste.",
              tone: "warning" as const,
            },
            {
              icon: CloudRain,
              title: "Monitorar seca",
              desc: "Modelo prevê 14 dias sem chuva. Antecipar plano de contingência.",
              tone: "danger" as const,
            },
          ].map((r) => {
            const Icon = r.icon;
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
