import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageHeader } from "@/components/ui-bits";
import { GeoMap } from "@/components/GeoMap";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Box, Download, Layers, Map as MapIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useAgroSoil,
  useAgroWeather,
  useHorizonFeatures,
  useSatelliteHistory,
} from "@/lib/api/hooks";
import { useFarm, useFarmLocation } from "@/lib/farm/farm-context";
import { useActivePolygon } from "@/lib/farm/use-active-polygon";
import { horizonToRiskScore } from "@/lib/api/adapters";
import { averageNdvi } from "@/lib/api/overview-adapters";
import { centroidFromFeature } from "@/lib/farm/polygon-utils";
import { buildLayerMetricsFromApi, buildLayerMetricLabels, layerGeometryColor } from "@/lib/geo/layer-metrics";
import {
  DEFAULT_ACTIVE_LAYERS,
  LAYER_IDS,
  LAYER_META,
  type BasemapId,
} from "@/lib/geo/map-layers";

export const Route = createFileRoute("/_app/mapa")({
  head: () => ({ meta: [{ title: "Mapa · Prevagro" }] }),
  component: MapaPage,
});

const BASEMAPS: { id: BasemapId; label: string }[] = [
  { id: "satellite", label: "Satélite" },
  { id: "terrain", label: "Relevo" },
  { id: "dark", label: "Escuro" },
];

function MapaPage() {
  const [active, setActive] = useState<string[]>([...DEFAULT_ACTIVE_LAYERS]);
  const [basemap, setBasemap] = useState<BasemapId>("satellite");
  const [layerOpacity, setLayerOpacity] = useState(0.85);
  const [is3D, setIs3D] = useState(false);

  const { selectedFarm, farmDisplayName, farmLocationLabel } = useFarm();
  const location = useFarmLocation();
  const activePolygon = useActivePolygon();
  const { latitude, longitude } = location;
  const hasLocation = latitude != null && longitude != null;

  const weather = useAgroWeather(latitude ?? 0, longitude ?? 0, hasLocation);
  const soil = useAgroSoil(latitude ?? 0, longitude ?? 0, hasLocation);
  const horizon = useHorizonFeatures();
  const satellite = useSatelliteHistory(activePolygon.polygonId);

  const toggle = (l: string) =>
    setActive((a) => (a.includes(l) ? a.filter((x) => x !== l) : [...a, l]));

  const farmLabel = farmDisplayName || activePolygon.polygon?.name || "Fazenda";
  const polygonName = activePolygon.polygon?.name;
  const apiRisk = horizon.isSuccess ? horizonToRiskScore(horizon.data) : null;
  const riskScore = apiRisk;
  const riskLabel =
    riskScore != null
      ? `${riskScore}/100`
      : horizon.isError || weather.isError
        ? "—"
        : "—";
  const temp =
    weather.data?.main?.temp_celsius != null
      ? weather.data.main.temp_celsius
      : null;
  const umidade =
    weather.data?.main?.humidity != null ? Math.round(weather.data.main.humidity) : null;
  const soloMoisture = soil.data?.moisture;
  const soloLabel =
    soloMoisture != null ? `${Math.round(soloMoisture * 100)}% umid.` : "—";
  const ndviAvg = satellite.data ? averageNdvi(satellite.data) : null;
  const areaHa = activePolygon.areaHa;
  const layerMetrics = useMemo(
    () =>
      buildLayerMetricsFromApi({
        weather: weather.data,
        soil: soil.data,
        satellite: satellite.data,
        riskScore: apiRisk,
      }),
    [weather.data, soil.data, satellite.data, apiRisk],
  );
  const layerLabels = useMemo(
    () =>
      buildLayerMetricLabels({
        weather: weather.data,
        soil: soil.data,
        satellite: satellite.data,
        riskScore: apiRisk,
      }),
    [weather.data, soil.data, satellite.data, apiRisk],
  );

  const metrics = [
    { k: "Área", v: areaHa != null ? `${areaHa} ha` : "—" },
    { k: "Risco", v: riskLabel },
    { k: "NDVI", v: ndviAvg != null ? ndviAvg.toFixed(2) : "—" },
    { k: "Temperatura", v: temp != null ? `${temp.toFixed(1)} °C` : "—" },
    { k: "Umidade", v: umidade != null ? `${umidade} %` : "—" },
    { k: "Solo", v: soloLabel },
  ];

  const polygonHint =
    activePolygon.polygonId != null
      ? ` · Polígono ${polygonName ?? activePolygon.polygonId}`
      : activePolygon.isLoading
        ? " · Carregando polígono…"
        : " · Sem polígono vinculado";

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
            vizMode="auto"
            layerOpacity={layerOpacity}
            is3D={is3D}
            onToggle3D={() => setIs3D((v) => !v)}
            perimeterFeature={activePolygon.feature}
            mapBounds={activePolygon.bounds}
            mapMaxBounds={activePolygon.maxBounds}
            centroid={centroidFromFeature(activePolygon.feature)}
            farmLabel={farmLabel}
            areaHa={areaHa}
            riskScore={riskScore}
            layerMetrics={layerMetrics}
            layerLabels={layerLabels}
          />

          <section className="panel rounded-lg p-4">
            <p className="text-xs text-muted-foreground">Perímetro analisado</p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">{farmLabel}</h3>
            <p className="text-xs text-muted-foreground">
              {farmLocationLabel ??
                (polygonName ? `Polígono AgroMonitoring · ${polygonName}` : "Coordenadas da fazenda ativa")}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Dados via API
              {polygonHint}
            </p>

            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
              {metrics.map((item) => (
                <div key={item.k} className="rounded-lg border border-border bg-surface p-3">
                  <dt className="text-xs text-muted-foreground">{item.k}</dt>
                  <dd className="mt-1 text-base font-semibold text-foreground">{item.v}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <section className="panel rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <Layers className="h-4 w-4 text-primary" />
              Camadas
            </div>
            <div className="flex flex-col gap-2">
              {LAYER_IDS.map((id) => {
                const meta = LAYER_META[id];
                const on = active.includes(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggle(id)}
                    aria-pressed={on}
                    aria-label={meta.label}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                      on
                        ? "border-primary/40 bg-primary/10 text-foreground"
                        : "border-border bg-surface/60 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <span className="font-medium">{meta.label}</span>
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: rgbToHex(layerGeometryColor(id, layerMetrics)) }}
                      aria-hidden
                    />
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel rounded-lg p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
              <MapIcon className="h-4 w-4 text-primary" />
              Basemap
            </div>
            <div className="flex flex-wrap gap-2">
              {BASEMAPS.map((b) => (
                <Button
                  key={b.id}
                  size="sm"
                  variant={basemap === b.id ? "default" : "outline"}
                  onClick={() => setBasemap(b.id)}
                >
                  {b.label}
                </Button>
              ))}
            </div>
          </section>

          <section className="panel rounded-lg p-4">
            <p className="mb-3 text-sm font-medium text-foreground">Opacidade das camadas</p>
            <Slider
              value={[layerOpacity * 100]}
              onValueChange={(v) => setLayerOpacity(v[0] / 100)}
              max={100}
              step={5}
            />
          </section>
        </aside>
      </div>
    </>
  );
}

function rgbToHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
