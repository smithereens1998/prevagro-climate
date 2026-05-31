import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/ui-bits";
import { GeoMap } from "@/components/GeoMap";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Box, Download, Layers, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FARM_METRICS, FARM_PERIMETER, getRiskScore, type Risco } from "@/lib/geo/farm-data";
import {
  useAgroPolygons,
  useAgroSoil,
  useAgroWeather,
  useFarmLocation,
  useHorizonFeatures,
} from "@/lib/api/hooks";
import { horizonToRiskScore } from "@/lib/api/adapters";
import {
  DEFAULT_ACTIVE_LAYERS,
  LAYER_IDS,
  LAYER_META,
  type BasemapId,
  type VizMode,
} from "@/lib/geo/map-layers";

export const Route = createFileRoute("/_app/mapa")({
  head: () => ({ meta: [{ title: "Mapa · Prevagro" }] }),
  component: MapaPage,
});

const VIZ_MODES: { id: VizMode; label: string; hint: string }[] = [
  { id: "auto", label: "Automático", hint: "Melhor tipo por camada" },
  { id: "heatmap", label: "Calor", hint: "Heatmap na área" },
  { id: "geometry", label: "Geometria", hint: "Polígono colorido" },
  { id: "columns", label: "Colunas 3D", hint: "Barra no centro" },
];

const BASEMAPS: { id: BasemapId; label: string }[] = [
  { id: "satellite", label: "Satélite" },
  { id: "terrain", label: "Relevo" },
  { id: "dark", label: "Escuro" },
];

const riscoTone: Record<Risco, string> = {
  Baixo: "text-primary",
  Médio: "text-warning",
  Alto: "text-destructive",
};

function MapaPage() {
  const [active, setActive] = useState<string[]>([...DEFAULT_ACTIVE_LAYERS]);
  const [basemap, setBasemap] = useState<BasemapId>("satellite");
  const [vizMode, setVizMode] = useState<VizMode>("auto");
  const [layerOpacity, setLayerOpacity] = useState(0.85);
  const [is3D, setIs3D] = useState(false);

  const location = useFarmLocation();
  const { latitude, longitude } = location;
  const weather = useAgroWeather(latitude!, longitude!);
  const soil = useAgroSoil(latitude!, longitude!);
  const horizon = useHorizonFeatures();
  const polygons = useAgroPolygons();

  const toggle = (l: string) =>
    setActive((a) => (a.includes(l) ? a.filter((x) => x !== l) : [...a, l]));

  const farm = FARM_PERIMETER.properties;
  const m = FARM_METRICS;
  const apiRisk = horizon.isSuccess ? horizonToRiskScore(horizon.data) : null;
  const riskScore = apiRisk ?? getRiskScore();
  const temp = weather.data?.main?.temp_celsius != null ? weather.data.main.temp_celsius : m.temp;
  const umidade =
    weather.data?.main?.humidity != null ? Math.round(weather.data.main.humidity) : m.umidade;
  const soloMoisture = soil.data?.moisture;
  const soloLabel =
    soloMoisture != null
      ? `${Math.round(soloMoisture * 100)}% umid.`
      : `${Math.round(m.soloScore * 100)}/100`;

  const metrics = [
    { k: "Área", v: `${farm.hectares} ha` },
    {
      k: "Risco",
      v: `${m.risco} (${riskScore}/100)`,
      tone: riscoTone[m.risco],
    },
    { k: "NDVI", v: m.ndvi.toFixed(2) },
    { k: "Temperatura", v: `${temp.toFixed(1)} °C` },
    { k: "Umidade", v: `${umidade} %` },
    { k: "Solo", v: soloLabel },
  ];
  const polygonHint =
    polygons.isSuccess && polygons.data.length > 0
      ? ` · ${polygons.data.length} polígono(s) AgroMonitoring`
      : "";

  return (
    <>
      <PageHeader
        title="Mapa Geoespacial"
        description="Análise do perímetro da fazenda — calor, geometria e visão 3D."
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              aria-pressed={is3D}
              onClick={() => setIs3D((v) => !v)}
              className={cn(is3D && "border-primary/40 bg-primary/10 text-foreground")}
            >
              <Box className="h-4 w-4" /> {is3D ? "Visão 2D" : "Visão 3D"}
            </Button>
            <Button size="sm" variant="outline">
              <Download className="h-4 w-4" /> Exportar
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="flex min-w-0 flex-col gap-4">
          <GeoMap
            className="h-[calc(100vh-320px)] min-h-[420px]"
            activeLayers={active}
            basemap={basemap}
            vizMode={vizMode}
            layerOpacity={layerOpacity}
            is3D={is3D}
            onToggle3D={() => setIs3D((v) => !v)}
          />

          <section className="panel rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Perímetro analisado</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{farm.nome}</h3>
            <p className="text-xs text-muted-foreground">
              {farm.municipio} · {farm.cultura} · Safra {farm.safra}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {farm.fonte}
              {polygonHint}
              {weather.isError && horizon.isError ? " · API offline (mock)" : ""}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
              {metrics.map((item) => (
                <div key={item.k} className="rounded-lg border border-border bg-surface p-3">
                  <dt className="text-xs text-muted-foreground">{item.k}</dt>
                  <dd
                    className={cn("mt-1 text-base font-semibold", item.tone ?? "text-foreground")}
                  >
                    {item.v}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <section className="panel rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <MapIcon className="h-4 w-4 text-primary" /> Basemap
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {BASEMAPS.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  aria-pressed={basemap === b.id}
                  onClick={() => setBasemap(b.id)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-xs font-medium transition-colors",
                    basemap === b.id
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </section>

          <section className="panel rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers className="h-4 w-4 text-primary" /> Visualização
            </div>
            <div className="mb-4 grid grid-cols-2 gap-1.5">
              {VIZ_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  title={mode.hint}
                  aria-pressed={vizMode === mode.id}
                  onClick={() => setVizMode(mode.id)}
                  className={cn(
                    "rounded-lg border px-2 py-2 text-left text-xs transition-colors",
                    vizMode === mode.id
                      ? "border-primary/40 bg-primary/10 text-foreground"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="font-medium">{mode.label}</span>
                  <span className="mt-0.5 block text-[10px] opacity-70">{mode.hint}</span>
                </button>
              ))}
            </div>

            <label className="mb-1 block text-xs text-muted-foreground">
              Opacidade das camadas · {Math.round(layerOpacity * 100)}%
            </label>
            <Slider
              value={[layerOpacity * 100]}
              min={20}
              max={100}
              step={5}
              onValueChange={([v]) => setLayerOpacity(v / 100)}
              aria-label="Opacidade das camadas de dados"
            />
          </section>

          <section className="panel rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Layers className="h-4 w-4 text-primary" /> Camadas de dados
            </div>
            <div className="space-y-1.5">
              {LAYER_IDS.map((l) => {
                const on = active.includes(l);
                const viz = LAYER_META[l].defaultViz;
                return (
                  <button
                    key={l}
                    type="button"
                    onClick={() => toggle(l)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                      on
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-surface text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span>
                      {l}
                      <span className="ml-2 text-[10px] opacity-60">{viz}</span>
                    </span>
                    <span
                      className={cn("h-1.5 w-8 rounded-full", on ? "bg-primary" : "bg-muted")}
                    />
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </>
  );
}
