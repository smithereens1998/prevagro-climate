import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Coffee, Loader2, MapPin, Sprout, Wheat } from "lucide-react";
import { PageHeader, SectionCard } from "@/components/ui-bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAgroPolygons, useCreateCoordinateMutation } from "@/lib/api/hooks";
import { useFarm } from "@/lib/farm/farm-context";
import { ApiError } from "@/lib/api/client";

export const Route = createFileRoute("/_app/fazendas/nova")({
  head: () => ({ meta: [{ title: "Nova Fazenda · Prevagro" }] }),
  component: NewFarmPage,
});

function NewFarmPage() {
  const navigate = useNavigate();
  const { selectFarm, refetchFarms } = useFarm();
  const polygons = useAgroPolygons();
  const createFarm = useCreateCoordinateMutation();

  const [name, setName] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [polygonId, setPolygonId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleUsePolygon = (id: string, lat: number, lon: number, polygonName?: string) => {
    setPolygonId(id);
    setLatitude(String(lat));
    setLongitude(String(lon));
    if (!name.trim() && polygonName) setName(polygonName);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    const lat = Number(latitude.replace(",", "."));
    const lon = Number(longitude.replace(",", "."));

    if (!name.trim()) {
      setError("Informe o nome da fazenda.");
      return;
    }
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      setError("Latitude e longitude devem ser números válidos.");
      return;
    }

    try {
      const result = await createFarm.mutateAsync({
        payload: { name: name.trim(), latitude: lat, longitude: lon },
        polygonId: polygonId || undefined,
      });
      selectFarm(result.coordinate);
      refetchFarms();
      void navigate({ to: "/" });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Não foi possível cadastrar a fazenda.";
      setError(message);
    }
  };

  return (
    <>
      <PageHeader
        title="Cadastrar fazenda"
        description="Registre a propriedade que será monitorada. Soja, café e outras culturas compartilham a mesma base geográfica."
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <SectionCard title="Dados da propriedade" subtitle="Coordenadas usadas em todas as consultas da API">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="farm-name">Nome da fazenda</Label>
              <Input
                id="farm-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Data Coffe · Fazenda Daterra"
                autoComplete="organization"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="farm-lat">Latitude</Label>
                <Input
                  id="farm-lat"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-18.9439"
                  inputMode="decimal"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="farm-lon">Longitude</Label>
                <Input
                  id="farm-lon"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-46.9925"
                  inputMode="decimal"
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="submit" disabled={createFarm.isPending}>
                {createFarm.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
                Salvar e entrar
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/fazendas">Cancelar</Link>
              </Button>
            </div>
          </form>
        </SectionCard>

        <div className="space-y-4">
          <SectionCard title="Polígonos AgroMonitoring" subtitle="Opcional — vincula área satelital automaticamente">
            {polygons.isLoading && (
              <div className="flex justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {polygons.isError && (
              <p className="text-sm text-muted-foreground">
                Não foi possível listar polígonos. Você ainda pode cadastrar manualmente.
              </p>
            )}
            {polygons.isSuccess && polygons.data.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhum polígono encontrado na conta AgroMonitoring.</p>
            )}
            {polygons.isSuccess &&
              polygons.data.slice(0, 6).map((polygon) => {
                const [lng, lat] = polygon.center ?? [0, 0];
                return (
                  <button
                    key={polygon.id}
                    type="button"
                    onClick={() => handleUsePolygon(polygon.id, lat, lng, polygon.name)}
                    className="mb-2 w-full rounded-lg border border-border bg-surface/60 p-3 text-left text-sm transition-colors hover:border-primary/40"
                  >
                    <p className="font-medium text-foreground">{polygon.name ?? polygon.id}</p>
                    <p className="text-xs text-muted-foreground">
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                      {polygon.area ? ` · ${Math.round(polygon.area / 10000)} ha` : ""}
                    </p>
                  </button>
                );
              })}
          </SectionCard>

          <SectionCard title="Culturas suportadas" subtitle="Monitoramento agro climático">
            <div className="grid gap-3">
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3">
                <Coffee className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm font-medium">Café</p>
                  <p className="text-xs text-muted-foreground">Risco hídrico e estresse térmico</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3">
                <Wheat className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Soja</p>
                  <p className="text-xs text-muted-foreground">Janelas climáticas e alertas</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-border bg-surface/60 p-3">
                <Sprout className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-sm font-medium">Outras culturas</p>
                  <p className="text-xs text-muted-foreground">Mesma base de coordenadas e pipeline</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </div>
    </>
  );
}
