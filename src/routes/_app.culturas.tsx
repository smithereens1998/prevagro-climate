import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/culturas")({
  head: () => ({ meta: [{ title: "Culturas · Prevagro" }] }),
  component: CulturasPage,
});

const crops = [
  { c: "Soja", a: "642 ha", s: "24/25", e: "Floração", p: "82 sc/ha", status: "ok" },
  { c: "Milho", a: "318 ha", s: "24/25", e: "Vegetativo", p: "168 sc/ha", status: "ok" },
  { c: "Sorgo", a: "144 ha", s: "24/25", e: "Plantio", p: "—", status: "new" },
  { c: "Trigo", a: "98 ha", s: "23/24", e: "Colhido", p: "62 sc/ha", status: "done" },
  { c: "Feijão", a: "46 ha", s: "24/25", e: "Maturação", p: "38 sc/ha", status: "warn" },
];

const statusMap = {
  ok: "bg-primary/15 text-primary",
  warn: "bg-warning/15 text-warning",
  done: "bg-muted text-muted-foreground",
  new: "bg-secondary/20 text-secondary",
} as const;

function CulturasPage() {
  return (
    <>
      <PageHeader
        title="Gestão de Culturas"
        description="Plantio, ciclo e performance das culturas ativas."
        action={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            <Plus className="h-4 w-4" /> Nova Cultura
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SectionCard title="Culturas Ativas" subtitle="Em ciclo na safra atual">
          <p className="text-4xl font-semibold text-foreground">4</p>
          <p className="mt-1 text-xs text-muted-foreground">+1 vs safra anterior</p>
        </SectionCard>
        <SectionCard title="Performance Média" subtitle="Sacas / hectare">
          <p className="text-4xl font-semibold text-foreground">87,5 <span className="text-base text-primary">↑</span></p>
          <p className="mt-1 text-xs text-primary">+8% vs média histórica</p>
        </SectionCard>
        <SectionCard title="Previsão de Colheita" subtitle="Próxima janela">
          <p className="text-2xl font-semibold text-foreground"><Calendar className="inline h-5 w-5 text-primary" /> 18 Mar 2026</p>
          <p className="mt-1 text-xs text-muted-foreground">Soja — Talhões 03, 04, 07</p>
        </SectionCard>
      </div>

      <SectionCard title="Culturas" subtitle="Detalhamento por cultura ativa">
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-3 font-medium">Cultura</th>
                <th className="px-3 py-3 font-medium">Área</th>
                <th className="px-3 py-3 font-medium">Safra</th>
                <th className="px-3 py-3 font-medium">Estágio</th>
                <th className="px-3 py-3 font-medium">Produtividade</th>
              </tr>
            </thead>
            <tbody>
              {crops.map((c) => (
                <tr key={c.c} className="border-b border-border/50 transition-colors hover:bg-accent/40">
                  <td className="px-3 py-3 font-medium text-foreground">{c.c}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.a}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.s}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusMap[c.status as keyof typeof statusMap])}>
                      {c.e}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-foreground inline-flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" /> {c.p}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </>
  );
}
