import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import {
  Droplets,
  Leaf,
  Scale,
  Shield,
  Users,
  Download,
  FileSpreadsheet,
  Share2,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/relatorios")({
  head: () => ({ meta: [{ title: "Relatórios ESG · Prevagro" }] }),
  component: RelatoriosEsgPage,
});

const ESG_REPORTS = [
  {
    t: "Inventário de Emissões GEE",
    d: "Escopos 1 e 2 · safra 24/25",
    cat: "Ambiental",
    icon: Leaf,
    tone: "primary" as const,
  },
  {
    t: "Balanço Hídrico da Propriedade",
    d: "Consumo, captação e reuso · Q1 2026",
    cat: "Ambiental",
    icon: Droplets,
    tone: "primary" as const,
  },
  {
    t: "Conformidade CAR e Reserva Legal",
    d: "Atualizado em 30/05/2026",
    cat: "Governança",
    icon: Shield,
    tone: "warning" as const,
  },
  {
    t: "Diversidade e Uso do Solo",
    d: "Cobertura vegetal e APP · 782 ha",
    cat: "Ambiental",
    icon: Leaf,
    tone: "primary" as const,
  },
  {
    t: "Práticas Sociais e Segurança",
    d: "Equipe e capacitação · semestre 1",
    cat: "Social",
    icon: Users,
    tone: "warning" as const,
  },
  {
    t: "Relatório ESG Consolidado",
    d: "Indicadores GRI · safra 24/25",
    cat: "Consolidado",
    icon: Scale,
    tone: "primary" as const,
  },
];

const toneMap = {
  primary: "bg-primary/15 text-primary",
  warning: "bg-warning/15 text-warning",
  danger: "bg-destructive/15 text-destructive",
} as const;

const FILTERS = ["Todos", "Ambiental", "Social", "Governança", "Consolidado"];

function RelatoriosEsgPage() {
  return (
    <>
      <PageHeader
        title="Relatórios ESG"
        description="Documentação ambiental, social e de governança para auditoria, crédito e cadeia."
        action={
          <Button>
            <Plus className="h-4 w-4" /> Novo relatório ESG
          </Button>
        }
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((c, i) => (
          <button
            key={c}
            type="button"
            className={cn(
              "rounded-md border px-3 py-1.5 text-sm transition-colors",
              i === 0
                ? "border-border bg-muted text-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {ESG_REPORTS.map((r) => {
          const Icon = r.icon;
          return (
            <SectionCard key={r.t}>
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    toneMap[r.tone],
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {r.cat}
                  </span>
                  <h3 className="mt-1.5 text-sm font-semibold text-foreground">{r.t}</h3>
                  <p className="text-xs text-muted-foreground">{r.d}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-1.5">
                <Button variant="outline" size="sm" className="flex-1">
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
                <Button variant="outline" size="sm" className="flex-1">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </Button>
                <Button variant="ghost" size="icon" className="shrink-0" aria-label="Compartilhar">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </SectionCard>
          );
        })}
      </div>
    </>
  );
}
