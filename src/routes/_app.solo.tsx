import { createFileRoute } from "@tanstack/react-router";
import { KpiCard, PageHeader, SectionCard } from "@/components/ui-bits";
import { Sprout, FlaskConical, Droplets, Layers, Brain } from "lucide-react";
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

export const Route = createFileRoute("/_app/solo")({
  head: () => ({ meta: [{ title: "Solo · Prevagro" }] }),
  component: SoloPage,
});

const trend = Array.from({ length: 12 }).map((_, i) => ({
  m: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"][i],
  q: 55 + Math.sin(i / 2) * 10 + Math.random() * 5,
}));
const nutrients = [
  { n: "N", v: 78 },
  { n: "P", v: 62 },
  { n: "K", v: 41 },
  { n: "Ca", v: 70 },
  { n: "Mg", v: 58 },
  { n: "S", v: 49 },
];

const tip = {
  contentStyle: { background: "oklch(0.244 0.026 240)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 12, color: "#fff", fontSize: 12 },
};

function SoloPage() {
  return (
    <>
      <PageHeader title="Inteligência de Solo" description="Saúde, fertilidade e composição." />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="pH" value="6.2" icon={FlaskConical} tone="primary" delta={1} />
        <KpiCard label="Matéria Orgânica" value="3.4" unit="%" icon={Sprout} tone="primary" delta={5} />
        <KpiCard label="Retenção Hídrica" value="62" unit="%" icon={Droplets} tone="primary" delta={2} />
        <KpiCard label="Compactação" value="Média" icon={Layers} tone="warning" />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title="Heatmap de Saúde do Solo" subtitle="Composição por talhão">
          <div className="grid grid-cols-8 gap-1.5">
            {Array.from({ length: 64 }).map((_, i) => {
              const v = Math.random();
              const color = v < 0.3 ? "#FF4D4F" : v < 0.6 ? "#F4B400" : "#6BE234";
              return (
                <div
                  key={i}
                  className="aspect-square rounded-md"
                  style={{ background: color, opacity: 0.35 + v * 0.65 }}
                />
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <span>Baixa</span>
            <span className="h-1.5 w-20 rounded-full bg-gradient-to-r from-destructive via-warning to-primary" />
            <span>Alta saúde</span>
          </div>
        </SectionCard>

        <SectionCard title="Distribuição de Nutrientes" subtitle="Nível atual (%)">
          <div className="h-60">
            <ResponsiveContainer>
              <BarChart data={nutrients} layout="vertical">
                <CartesianGrid stroke="#ffffff10" horizontal={false} />
                <XAxis type="number" stroke="#AAB6C4" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="n" stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip {...tip} />
                <Bar dataKey="v" fill="#6BE234" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Tendência de Qualidade do Solo" subtitle="Índice agregado · 12 meses" className="mb-6">
        <div className="h-56">
          <ResponsiveContainer>
            <LineChart data={trend}>
              <CartesianGrid stroke="#ffffff10" vertical={false} />
              <XAxis dataKey="m" stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#AAB6C4" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip {...tip} />
              <Line type="monotone" dataKey="q" stroke="#6BE234" strokeWidth={2.5} dot={{ fill: "#6BE234", r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard title="Sugestões da IA">
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { t: "Correção de solo", d: "Aplicar calcário dolomítico (1,8 t/ha) na área leste para elevar pH a 6.5.", icon: FlaskConical },
            { t: "Fertilização", d: "Reforçar potássio (KCl 80 kg/ha) — déficit em 23% da área.", icon: Sprout },
            { t: "Irrigação", d: "Reduzir vazão no Talhão 02; retenção hídrica acima do ideal.", icon: Droplets },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.t} className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-foreground">{s.t}</p>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.d}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Brain className="h-3.5 w-3.5 text-primary" /> Geradas em tempo real pelo modelo Prevagro AI
        </div>
      </SectionCard>
    </>
  );
}
