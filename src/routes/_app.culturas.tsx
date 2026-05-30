import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CROP_FOCUS,
  FARM_HECTARES,
  FARM_KPI_DELTAS,
  FARM_NAME,
  FARM_SAFRA,
  getWeightedProductivity,
} from "@/lib/farm-insights";

export const Route = createFileRoute("/_app/culturas")({
  head: () => ({ meta: [{ title: "Culturas · Prevagro" }] }),
  component: CulturasPage,
});

const statusMap = {
  ok: "bg-primary/15 text-primary",
  warn: "bg-warning/15 text-warning",
  done: "bg-muted text-muted-foreground",
  new: "bg-secondary/20 text-secondary",
} as const;

const avgProd = getWeightedProductivity();

function CulturasPage() {
  return (
    <>
      <PageHeader
        title="Gestão de Culturas"
        description={`${FARM_NAME} — café e soja na safra ${FARM_SAFRA}.`}
        action={
          <Button>
            <Plus className="h-4 w-4" /> Nova cultura
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <SectionCard title="Culturas Ativas" subtitle="Em ciclo na safra atual">
          <p className="text-4xl font-semibold text-foreground">{CROP_FOCUS.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">Café e soja · {FARM_HECTARES} ha total</p>
        </SectionCard>
        <SectionCard title="Performance Média" subtitle="Sacas / hectare ponderado">
          <p className="text-4xl font-semibold text-foreground">
            {avgProd.toFixed(1).replace(".", ",")}{" "}
            <span className="text-base text-primary">↑</span>
          </p>
          <p className="mt-1 text-xs text-primary">+{FARM_KPI_DELTAS.produtividade}% vs média histórica</p>
        </SectionCard>
        <SectionCard title="Previsão de Colheita" subtitle="Próxima janela">
          <p className="text-2xl font-semibold text-foreground">
            <Calendar className="inline h-5 w-5 text-primary" /> Jun 2026
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Soja — enchimento de grãos</p>
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
                <th className="px-3 py-3 font-medium">NDVI</th>
                <th className="px-3 py-3 font-medium">Produtividade</th>
              </tr>
            </thead>
            <tbody>
              {CROP_FOCUS.map((c) => (
                <tr key={c.id} className="border-b border-border/50 transition-colors hover:bg-accent/40">
                  <td className="px-3 py-3 font-medium text-foreground">{c.name}</td>
                  <td className="px-3 py-3 text-muted-foreground">{c.areaHa} ha ({c.sharePct}%)</td>
                  <td className="px-3 py-3 text-muted-foreground">{FARM_SAFRA}</td>
                  <td className="px-3 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", statusMap[c.status])}>
                      {c.stage}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">{c.ndvi.toFixed(2)}</td>
                  <td className="px-3 py-3 text-foreground inline-flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-primary" /> {c.produtividade} {c.prodUnit}
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
