import { createFileRoute, Link } from "@tanstack/react-router";
import { Building2, MapPin, Plus } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { useFarm } from "@/lib/farm/farm-context";
import { formatCoordinatePair } from "@/lib/api/normalize";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/fazendas/")({
  head: () => ({ meta: [{ title: "Fazendas · Prevagro" }] }),
  component: FarmsPage,
});

function FarmsPage() {
  const { farms, selectedFarm, selectFarm } = useFarm();

  return (
    <>
      <PageHeader
        title="Fazendas"
        description="Selecione a propriedade que deseja monitorar. Cada fazenda funciona como um tenant no Prevagro."
        action={
          <Button asChild>
            <Link to="/fazendas/nova">
              <Plus className="h-4 w-4" />
              Nova fazenda
            </Link>
          </Button>
        }
      />

      {farms.length === 0 ? (
        <SectionCard title="Nenhuma fazenda cadastrada" subtitle="Comece cadastrando sua primeira propriedade">
          <p className="mb-4 text-sm text-muted-foreground">
            O painel usa as coordenadas da fazenda para buscar clima, solo, risco e análises de IA.
          </p>
          <Button asChild>
            <Link to="/fazendas/nova">Cadastrar primeira fazenda</Link>
          </Button>
        </SectionCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {farms.map((farm) => {
            const active = selectedFarm?.id === farm.id;
            return (
              <button
                key={farm.id}
                type="button"
                onClick={() => selectFarm(farm)}
                className={cn(
                  "rounded-xl border bg-surface p-5 text-left transition-colors hover:border-primary/40",
                  active ? "border-primary/50 ring-1 ring-primary/20" : "border-border",
                )}
                aria-label={`Selecionar ${farm.name}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  {active && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Ativa
                    </span>
                  )}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{farm.name}</h3>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  {formatCoordinatePair(farm.latitude, farm.longitude)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button asChild size="sm" variant={active ? "default" : "outline"}>
                    <Link to="/" onClick={() => selectFarm(farm)}>
                      Abrir painel
                    </Link>
                  </Button>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
