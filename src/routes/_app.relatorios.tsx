import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { CloudRain, Sprout, FlaskConical, TrendingUp, Download, FileSpreadsheet, Share2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios · Prevagro" }] }),
  component: RelatoriosPage,
});

const reports = [
  { t: "Relatório Climático Mensal", d: "Mar 2026", cat: "Clima", icon: CloudRain, tone: "primary" },
  { t: "Análise de Solo — Talhão 04", d: "12 Mar 2026", cat: "Solo", icon: FlaskConical, tone: "warning" },
  { t: "NDVI e Vegetação", d: "Semana 11", cat: "Vegetação", icon: Sprout, tone: "primary" },
  { t: "Produtividade Comparativa", d: "Safra 24/25", cat: "Produtividade", icon: TrendingUp, tone: "primary" },
  { t: "Histórico de Chuvas", d: "12 meses", cat: "Clima", icon: CloudRain, tone: "primary" },
  { t: "Fertilização Recomendada", d: "Q1 2026", cat: "Solo", icon: FlaskConical, tone: "warning" },
];

const toneMap = {
  primary: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
} as const;

function RelatoriosPage() {
  return (
    <>
      <PageHeader
        title="Central de Relatórios"
        description="Documentos prontos para download, exportação e compartilhamento."
        action={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            <Sparkles className="h-4 w-4" /> Gerar Relatório
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {["Todos", "Clima", "Solo", "Vegetação", "Produtividade"].map((c, i) => (
          <button
            key={c}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors",
              i === 0
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => {
          const Icon = r.icon;
          return (
            <SectionCard key={r.t}>
              <div className="flex items-start gap-3">
                <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", toneMap[r.tone as keyof typeof toneMap])}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">{r.cat}</span>
                  </div>
                  <h3 className="mt-1.5 text-sm font-semibold text-foreground">{r.t}</h3>
                  <p className="text-xs text-muted-foreground">{r.d}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-1.5">
                <Button variant="outline" size="sm" className="flex-1"><Download className="h-3.5 w-3.5" /> PDF</Button>
                <Button variant="outline" size="sm" className="flex-1"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</Button>
                <Button variant="ghost" size="icon" className="shrink-0"><Share2 className="h-4 w-4" /></Button>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </>
  );
}
