import { createFileRoute } from "@tanstack/react-router";
import { KpiCard, PageHeader, SectionCard } from "@/components/ui-bits";
import { CloudRain, Droplets, Sun, Wind, Cloud, CloudSnow, CloudLightning, Brain } from "lucide-react";
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

export const Route = createFileRoute("/_app/clima")({
  head: () => ({ meta: [{ title: "Clima · Prevagro" }] }),
  component: ClimaPage,
});

const chuvaData = Array.from({ length: 30 }).map((_, i) => ({
  d: `${i + 1}`,
  mm: Math.max(0, Math.round(Math.random() * 25 + Math.sin(i / 3) * 10)),
}));
const tempData = Array.from({ length: 30 }).map((_, i) => ({
  d: `${i + 1}`,
  max: 26 + Math.sin(i / 4) * 5 + Math.random() * 2,
  min: 16 + Math.sin(i / 4) * 3 + Math.random() * 2,
}));
const forecast = [
  { d: "Hoje", t: 28, mn: 18, ic: Sun, c: "Ensolarado" },
  { d: "Ter", t: 30, mn: 19, ic: Sun, c: "Ensolarado" },
  { d: "Qua", t: 27, mn: 18, ic: Cloud, c: "Nublado" },
  { d: "Qui", t: 24, mn: 17, ic: CloudRain, c: "Chuva" },
  { d: "Sex", t: 22, mn: 16, ic: CloudLightning, c: "Tempestade" },
  { d: "Sáb", t: 25, mn: 16, ic: Cloud, c: "Nublado" },
  { d: "Dom", t: 28, mn: 17, ic: Sun, c: "Ensolarado" },
];

const tip = {
  contentStyle: {
    background: "oklch(0.244 0.026 240)",
    border: "1px solid oklch(1 0 0 / 0.08)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 12,
  },
};

function ClimaPage() {
  return (
    <>
      <PageHeader title="Inteligência Climática" description="Previsão, histórico e riscos climáticos." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Temperatura Média" value="24,8" unit="°C" delta={2} icon={Sun} tone="warning" />
        <KpiCard label="Chuva Acumulada" value="142" unit="mm" delta={-15} icon={CloudRain} tone="primary" />
        <KpiCard label="Umidade Relativa" value="68" unit="%" delta={4} icon={Droplets} tone="primary" />
        <KpiCard label="Velocidade do Vento" value="12,4" unit="km/h" delta={-3} icon={Wind} tone="muted" />
      </div>

      <SectionCard title="Previsão 7 dias" subtitle="Modelo combinado IA + estações locais" className="mb-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-7">
          {forecast.map((f, i) => {
            const Icon = f.ic;
            return (
              <div
                key={i}
                className="flex flex-col items-center rounded-xl border border-border bg-surface/60 p-4 transition-colors hover:border-primary/30"
              >
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{f.d}</p>
                <Icon className="my-3 h-8 w-8 text-primary" />
                <p className="text-lg font-semibold text-foreground">{f.t}°<span className="text-sm text-muted-foreground"> / {f.mn}°</span></p>
                <p className="mt-1 text-[11px] text-muted-foreground">{f.c}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <SectionCard title="Histórico de Chuva" subtitle="Últimos 30 dias (mm)">
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={chuvaData}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="d" stroke="#AAB6C4" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#AAB6C4" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Bar dataKey="mm" fill="#6BE234" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
        <SectionCard title="Histórico de Temperatura" subtitle="Máx / Mín (°C)">
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={tempData}>
                <CartesianGrid stroke="#ffffff10" vertical={false} />
                <XAxis dataKey="d" stroke="#AAB6C4" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#AAB6C4" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Line type="monotone" dataKey="max" stroke="#FF4D4F" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="min" stroke="#3FAE2A" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Previsão de Risco Climático" subtitle="Modelo IA">
        <div className="flex gap-4 rounded-xl border border-warning/30 bg-warning/5 p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/20 text-warning">
            <Brain className="h-5 w-5" />
          </div>
          <div className="space-y-2 text-sm text-foreground/90">
            <p>
              Risco de <strong className="text-warning">seca leve</strong> nos próximos 10–14 dias,
              com déficit hídrico estimado de 22 mm. Probabilidade de geada: <strong>baixa (8%)</strong>.
            </p>
            <p className="text-muted-foreground">
              Considere antecipar irrigação suplementar nas próximas 48h. Monitore a frente fria
              prevista para sexta-feira que pode trazer ventos acima de 35 km/h.
            </p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
