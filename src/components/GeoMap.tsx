// deck.gl accessors conflitam com tipos estritos do TS — runtime está correto.
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { Crosshair, Plus, Minus, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { MapLegend } from "@/components/MapLegend";
import {
  FARM_CENTER,
  FARM_PERIMETER,
  farmBounds,
  makeHeatGeoJSON,
  perimeterCentroid,
} from "@/lib/geo/farm-data";
import {
  BASEMAP_STYLES,
  fillColorForLayer,
  getLegendsForLayers,
  LAYER_IDS,
  LAYER_META,
  resolveVizKind,
  type BasemapId,
  type LayerId,
  type VizMode,
} from "@/lib/geo/map-layers";
import {
  heatmapColorExpression,
  NDVI_HEAT_RANGE,
  prodColor,
  rgbToHex,
  RISK_RANGE,
  SOLO_HEAT_RANGE,
  toRgba,
} from "@/lib/geo/map-colors";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

type GeoMapProps = {
  className?: string;
  activeLayers: string[];
  basemap: BasemapId;
  vizMode: VizMode;
  layerOpacity: number;
  is3D: boolean;
  onToggle3D: () => void;
};

const isLayerId = (id: string): id is LayerId => LAYER_IDS.includes(id as LayerId);

const PITCH_3D = 58;
const BEARING = -14;

const heatRangeForLayer = (layerId: LayerId) => {
  const meta = LAYER_META[layerId];
  if (meta.colorRange) return meta.colorRange;
  if (layerId === "Vegetação") return NDVI_HEAT_RANGE;
  if (layerId === "Solo") return SOLO_HEAT_RANGE;
  return RISK_RANGE;
};

const setupTerrain = (map: any) => {
  if (!map.getSource("mapbox-dem")) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
  }
  map.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });
  if (!map.getLayer("sky")) {
    map.addLayer({
      id: "sky",
      type: "sky",
      paint: {
        "sky-type": "atmosphere",
        "sky-atmosphere-sun": [0.0, 90.0],
        "sky-atmosphere-sun-intensity": 12,
      },
    });
  }
};

const clearTerrain = (map: any) => {
  map.setTerrain(null);
  if (map.getLayer("sky")) map.removeLayer("sky");
};

const runWhenMapReady = (map: any, fn: () => void) => {
  if (!map) return;
  if (map.isStyleLoaded()) {
    fn();
    return;
  }
  map.once("idle", fn);
};

const apply3DView = (map: any, is3D: boolean) => {
  if (is3D) {
    setupTerrain(map);
    map.easeTo({ pitch: PITCH_3D, bearing: BEARING, duration: 700 });
    return;
  }
  clearTerrain(map);
  map.easeTo({ pitch: 0, bearing: BEARING, duration: 700 });
};

const PERIMETER_SOURCE = "prevagro-perimeter";
const PERIMETER_FILL = "prevagro-perimeter-fill";
const PERIMETER_LINE = "prevagro-perimeter-line";
const PERIMETER_GLOW = "prevagro-perimeter-glow";
const DATA_LAYER_PREFIX = "prevagro-data";

const removeMapboxDataLayers = (map: any) => {
  const style = map.getStyle?.();
  if (!style?.layers) return;

  for (const layer of [...style.layers]) {
    if (layer.id.startsWith(DATA_LAYER_PREFIX)) map.removeLayer(layer.id);
  }
  for (const sourceId of Object.keys(style.sources ?? {})) {
    if (sourceId.startsWith(DATA_LAYER_PREFIX)) map.removeSource(sourceId);
  }
};

/** Camadas nativas Mapbox — heatmap (2D/3D) e fill/extrusion no terreno 3D. */
const syncMapboxDataLayers = (
  map: any,
  activeLayers: string[],
  vizMode: VizMode,
  opacity: number,
  is3D: boolean,
) => {
  removeMapboxDataLayers(map);

  for (const layerId of activeLayers.filter(isLayerId)) {
    const meta = LAYER_META[layerId];
    const kind = resolveVizKind(layerId, vizMode);
    const sourceId = `${DATA_LAYER_PREFIX}-${layerId}`;

    if (kind === "heatmap") {
      map.addSource(sourceId, { type: "geojson", data: makeHeatGeoJSON(meta.heatMetric) });
      map.addLayer({
        id: `${sourceId}-heat`,
        type: "heatmap",
        source: sourceId,
        paint: {
          "heatmap-weight": ["get", "weight"],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.9, 14, 1.5],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 28, 14, 50],
          "heatmap-opacity": opacity,
          "heatmap-color": heatmapColorExpression(heatRangeForLayer(layerId)),
        },
      });
      continue;
    }

    if (!is3D) continue;

    if (kind === "columns" && meta.columnValue) {
      map.addSource(sourceId, { type: "geojson", data: FARM_PERIMETER });
      map.addLayer({
        id: `${sourceId}-extrusion`,
        type: "fill-extrusion",
        source: sourceId,
        paint: {
          "fill-extrusion-color": rgbToHex(meta.geometryColor()),
          "fill-extrusion-height": meta.columnValue() * 4,
          "fill-extrusion-opacity": opacity * 0.85,
          "fill-extrusion-base": 0,
        },
      });
      continue;
    }

    if (kind === "geometry") {
      map.addSource(sourceId, { type: "geojson", data: FARM_PERIMETER });
      map.addLayer({
        id: `${sourceId}-fill`,
        type: "fill",
        source: sourceId,
        paint: {
          "fill-color": rgbToHex(meta.geometryColor()),
          "fill-opacity": opacity * 0.72,
        },
      });
    }
  }
};

/** Contorno nativo Mapbox — fica acima do relevo/terrain e visível no modo calor. */
const syncMapboxPerimeter = (map: any, is3D = false) => {
  if (!map.getSource(PERIMETER_SOURCE)) {
    map.addSource(PERIMETER_SOURCE, { type: "geojson", data: FARM_PERIMETER });
  } else {
    map.getSource(PERIMETER_SOURCE).setData(FARM_PERIMETER);
  }

  if (!map.getLayer(PERIMETER_FILL)) {
    map.addLayer({
      id: PERIMETER_FILL,
      type: "fill",
      source: PERIMETER_SOURCE,
      paint: {
        "fill-color": "#7CEC52",
        "fill-opacity": 0.14,
      },
    });
  }

  if (!map.getLayer(PERIMETER_GLOW)) {
    map.addLayer({
      id: PERIMETER_GLOW,
      type: "line",
      source: PERIMETER_SOURCE,
      paint: {
        "line-color": "#ffffff",
        "line-width": 5,
        "line-opacity": 0.55,
      },
    });
  }

  if (!map.getLayer(PERIMETER_LINE)) {
    map.addLayer({
      id: PERIMETER_LINE,
      type: "line",
      source: PERIMETER_SOURCE,
      paint: {
        "line-color": "#7CEC52",
        "line-width": 2.5,
        "line-opacity": 1,
      },
    });
  }

  if (map.getLayer(PERIMETER_FILL)) {
    map.setPaintProperty(PERIMETER_FILL, "fill-opacity", is3D ? 0.04 : 0.14);
  }

  // Garante contorno sempre no topo (acima de heatmap deck e hillshade).
  for (const id of [PERIMETER_FILL, PERIMETER_GLOW, PERIMETER_LINE]) {
    if (map.getLayer(id)) map.moveLayer(id);
  }
};

/** Silencia sprites ausentes (ex.: br-state-4) em estilos com rótulos administrativos. */
const bindStyleImageFallback = (map: any) => {
  if (map.__prevagroStyleImageBound) return;
  map.__prevagroStyleImageBound = true;
  map.on("styleimagemissing", (e: { id: string }) => {
    if (map.hasImage(e.id)) return;
    const size = 1;
    map.addImage(
      e.id,
      { width: size, height: size, data: new Uint8Array(size * size * 4) },
      { pixelRatio: 1 },
    );
  });
};

export function GeoMap({
  className,
  activeLayers,
  basemap,
  vizMode,
  layerOpacity,
  is3D,
  onToggle3D,
}: GeoMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const overlayRef = useRef<any>(null);
  const MapboxOverlayRef = useRef<any>(null);
  const libsRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [deckReady, setDeckReady] = useState(false);
  const prevBasemap = useRef(basemap);
  const is3DRef = useRef(is3D);
  const activeLayersRef = useRef(activeLayers);
  const vizModeRef = useRef(vizMode);
  const layerOpacityRef = useRef(layerOpacity);
  is3DRef.current = is3D;
  activeLayersRef.current = activeLayers;
  vizModeRef.current = vizMode;
  layerOpacityRef.current = layerOpacity;

  const legends = getLegendsForLayers(activeLayers);

  const attachDeckOverlay = (map: any) => {
    const MapboxOverlay = MapboxOverlayRef.current;
    if (!MapboxOverlay) return;
    if (overlayRef.current) {
      try {
        map.removeControl(overlayRef.current);
      } catch {
        /* overlay já removido após setStyle */
      }
    }
    const overlay = new MapboxOverlay({ interleaved: true, layers: [] });
    map.addControl(overlay);
    overlayRef.current = overlay;
    setDeckReady(true);
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        if (!MAPBOX_TOKEN) {
          if (!cancelled) setFailed(true);
          return;
        }

        const mapboxgl = (await import("mapbox-gl")).default;
        const { MapboxOverlay } = await import("@deck.gl/mapbox");
        const { GeoJsonLayer, ColumnLayer } = await import("@deck.gl/layers");
        if (cancelled || !containerRef.current) return;

        MapboxOverlayRef.current = MapboxOverlay;
        libsRef.current = { GeoJsonLayer, ColumnLayer };

        mapboxgl.accessToken = MAPBOX_TOKEN;
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: BASEMAP_STYLES[basemap],
          center: FARM_CENTER,
          zoom: 11.2,
          pitch: 0,
          bearing: -14,
          antialias: true,
        });

        mapRef.current = map;
        bindStyleImageFallback(map);

        map.on("load", () => {
          if (cancelled) return;
          syncMapboxPerimeter(map, is3D);
          attachDeckOverlay(map);
          map.fitBounds(farmBounds(), { padding: 64, duration: 0 });
          setReady(true);
        });
      } catch (err) {
        console.error("Falha ao iniciar o mapa:", err);
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      overlayRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || prevBasemap.current === basemap) return;
    prevBasemap.current = basemap;
    setDeckReady(false);

    map.setStyle(BASEMAP_STYLES[basemap]);
    map.once("style.load", () => {
      bindStyleImageFallback(map);
      syncMapboxPerimeter(map, is3DRef.current);
      attachDeckOverlay(map);
      if (is3DRef.current) setupTerrain(map);
      syncMapboxDataLayers(
        map,
        activeLayersRef.current,
        vizModeRef.current,
        layerOpacityRef.current,
        is3DRef.current,
      );
      syncMapboxPerimeter(map, is3DRef.current);
      map.fitBounds(farmBounds(), {
        padding: 64,
        duration: 400,
        pitch: is3DRef.current ? PITCH_3D : 0,
        bearing: BEARING,
      });
    });
  }, [basemap, ready]);

  useEffect(() => {
    if (!ready || !deckReady || !overlayRef.current || !libsRef.current) return;

    const map = mapRef.current;
    const syncLayers = () => {
      const { GeoJsonLayer, ColumnLayer } = libsRef.current;
      const layers: any[] = [];
      const alpha = layerOpacity;
      const [cx, cy] = perimeterCentroid();

      if (!is3D) {
        for (const layerId of activeLayers.filter(isLayerId)) {
          const meta = LAYER_META[layerId];
          const kind = resolveVizKind(layerId, vizMode);

          if (kind === "heatmap") continue;

          if (kind === "columns" && meta.columnValue) {
            layers.push(
              new ColumnLayer({
                id: `col-${layerId}`,
                data: [{ position: [cx, cy], value: meta.columnValue() }],
                diskResolution: 28,
                radius: 900,
                extruded: true,
                elevationScale: 30 * alpha,
                opacity: alpha,
                getPosition: (d) => d.position,
                getElevation: (d) => d.value,
                getFillColor: (d) => toRgba(prodColor(d.value), 220),
              }),
            );
            continue;
          }

          layers.push(
            new GeoJsonLayer({
              id: `geom-${layerId}`,
              data: FARM_PERIMETER,
              filled: true,
              stroked: false,
              opacity: alpha,
              getFillColor: fillColorForLayer(layerId, alpha),
              pickable: false,
            }),
          );
        }
      }

      overlayRef.current.setProps({ layers });
      syncMapboxDataLayers(map, activeLayers, vizMode, layerOpacity, is3D);
      syncMapboxPerimeter(map, is3D);
    };

    if (map?.isStyleLoaded()) {
      syncLayers();
      return;
    }
    map?.once("idle", syncLayers);
  }, [ready, deckReady, activeLayers, vizMode, layerOpacity, is3D]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;

    runWhenMapReady(map, () => {
      apply3DView(map, is3D);
      syncMapboxPerimeter(map, is3D);
    });
  }, [is3D, ready]);

  const handleZoom = (delta: number) => () =>
    mapRef.current?.zoomTo(mapRef.current.getZoom() + delta, { duration: 300 });

  const handleRecenter = () => {
    mapRef.current?.fitBounds(farmBounds(), {
      padding: 64,
      duration: 800,
      pitch: is3DRef.current ? PITCH_3D : 0,
      bearing: BEARING,
    });
  };

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-border", className)}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full [&_.mapboxgl-ctrl-attrib]:text-[10px]" />

      {!ready && !failed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 text-sm text-muted-foreground backdrop-blur">
          Carregando mapa…
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 px-6 text-center text-sm text-muted-foreground backdrop-blur">
          Não foi possível carregar o mapa. Verifique o token Mapbox (VITE_MAPBOX_TOKEN) e a conexão.
        </div>
      )}

      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute right-3 top-3 flex flex-col gap-1.5 rounded-lg border border-border bg-background/70 p-1 backdrop-blur">
          <button type="button" aria-label="Aproximar" onClick={handleZoom(1)} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Afastar" onClick={handleZoom(-1)} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Minus className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Centralizar fazenda" onClick={handleRecenter} className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <Crosshair className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Alternar visão 3D"
            aria-pressed={is3D}
            onClick={onToggle3D}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded text-xs font-medium transition-colors",
              is3D ? "bg-primary/20 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Box className="h-4 w-4" />
          </button>
        </div>

        <div className="absolute bottom-3 left-3 pointer-events-none">
          <MapLegend items={legends} />
        </div>
      </div>
    </div>
  );
}
