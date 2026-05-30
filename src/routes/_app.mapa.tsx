import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { SatelliteMap } from "@/components/SatelliteMap";
import { Button } from "@/components/ui/button";
import { Box, Download, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/mapa")({
  head: () => ({ meta: [{ title: "Mapa · Prevagro" }] }),
  component: MapaPage,
});

const LAYERS = ["Vegetação", "Temperatura", "Umidade", "Solo", "Risco Climático", "Produtividade"];

function MapaPage() {
  const [active, setActive] = useState<string[]>(["Vegetação", "Risco Climático"]);
  const toggle = (l: string) =>
    setActive((a) => (a.includes(l) ? a.filter((x) => x !== l) : [...a, l]));

  return (
    <>
      <PageHeader
        title="Mapa Geoespacial"
        description="Visualização estilo Google Earth com camadas de heatmap."
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Box className="h-4 w-4" /> 3D View</Button>
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"><Download className="h-4 w-4" /> Exportar</Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <SatelliteMap className="h-[calc(100vh-220px)] min-h-[480px]" />

        <div className="flex flex-col gap-4">
          <section className="glass-card rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers className="h-4 w-4 text-primary" /> Camadas
            </div>
            <div className="space-y-1.5">
              {LAYERS.map((l) => {
                const on = active.includes(l);
                return (
                  <button
                    key={l}
                    onClick={() => toggle(l)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                      on
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {l}
                    <span
                      className={cn(
                        "h-1.5 w-8 rounded-full",
                        on ? "bg-primary" : "bg-muted",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="glass-card rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Área selecionada</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">Talhão 04 — Sul</h3>
            <p className="text-xs text-muted-foreground">Soja · Safra 24/25</p>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              {[
                { k: "Hectares", v: "142 ha" },
                { k: "Risco", v: "Médio", tone: "warning" },
                { k: "NDVI", v: "0.68" },
                { k: "Produtividade", v: "82 sc/ha", tone: "primary" },
              ].map((m) => (
                <div key={m.k} className="rounded-lg border border-border bg-surface/60 p-3">
                  <dt className="text-xs text-muted-foreground">{m.k}</dt>
                  <dd
                    className={cn(
                      "mt-1 text-base font-semibold",
                      m.tone === "warning" && "text-warning",
                      m.tone === "primary" && "text-primary",
                      !m.tone && "text-foreground",
                    )}
                  >
                    {m.v}
                  </dd>
                </div>
              ))}
            </dl>

            <Button className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Ver análise completa
            </Button>
          </section>
        </div>
      </div>
    </>
  );
}
