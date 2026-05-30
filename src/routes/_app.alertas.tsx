import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Bug, CloudRain, Droplets, Snowflake, Sun, Wind, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/alertas")({
  head: () => ({ meta: [{ title: "Alertas · Prevagro" }] }),
  component: AlertasPage,
});

const alerts = [
  { t: "Seca prevista", d: "Modelo IA indica 14 dias sem chuva — Talhões 03, 04", time: "há 12 min", sev: "danger", icon: Sun, type: "Seca" },
  { t: "Chuva intensa esperada", d: "78 mm previstos para sexta — risco de erosão", time: "há 2h", sev: "warning", icon: CloudRain, type: "Chuva Intensa" },
  { t: "Pragas detectadas", d: "Sinal de lagarta da soja — Talhão 07", time: "há 5h", sev: "danger", icon: Bug, type: "Pragas" },
  { t: "Baixa umidade do solo", d: "Umidade 12% abaixo do ideal — região sul", time: "ontem", sev: "warning", icon: Droplets, type: "Baixa Umidade" },
  { t: "Calor excessivo", d: "Temperatura máxima projetada em 38°C", time: "ontem", sev: "warning", icon: Sun, type: "Calor Excessivo" },
  { t: "Risco baixo de geada", d: "Probabilidade <10% nas próximas 72h", time: "2 dias", sev: "ok", icon: Snowflake, type: "Geada" },
  { t: "Ventos fortes", d: "Rajadas até 42 km/h — possível tombamento", time: "3 dias", sev: "warning", icon: Wind, type: "Vento" },
];

const sevMap = {
  ok: { ring: "ring-primary/40", dot: "bg-primary", chip: "bg-primary/10 text-primary" },
  warning: { ring: "ring-warning/40", dot: "bg-warning", chip: "bg-warning/10 text-warning" },
  danger: { ring: "ring-destructive/40", dot: "bg-destructive", chip: "bg-destructive/10 text-destructive" },
} as const;

function AlertasPage() {
  return (
    <>
      <PageHeader title="Centro de Alertas" description="Alertas em tempo real com priorização inteligente." />

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { l: "Críticos", v: 2, c: "text-destructive" },
          { l: "Atenção", v: 4, c: "text-warning" },
          { l: "Estáveis", v: 12, c: "text-primary" },
          { l: "Total 7 dias", v: 23, c: "text-foreground" },
        ].map((s) => (
          <SectionCard key={s.l}>
            <p className="text-xs text-muted-foreground">{s.l}</p>
            <p className={cn("mt-1 text-3xl font-semibold", s.c)}>{s.v}</p>
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Timeline de Alertas" subtitle="Eventos detectados pela IA">
        <ol className="relative space-y-5 pl-6 before:absolute before:left-2 before:top-1 before:bottom-1 before:w-px before:bg-border">
          {alerts.map((a, i) => {
            const sev = sevMap[a.sev as keyof typeof sevMap];
            const Icon = a.icon;
            return (
              <li key={i} className="relative">
                <span
                  className={cn(
                    "absolute -left-[18px] top-1.5 h-3 w-3 rounded-full ring-4 ring-background",
                    sev.dot,
                  )}
                />
                <div className="rounded-xl border border-border bg-surface/60 p-4 transition-colors hover:border-primary/30">
                  <div className="flex items-start gap-3">
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1", sev.ring, sev.chip)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground">{a.t}</h4>
                        <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider", sev.chip)}>
                          {a.type}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{a.d}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">{a.time}</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" /> Modelo monitora 18 fontes em tempo real
        </div>
      </SectionCard>
    </>
  );
}
