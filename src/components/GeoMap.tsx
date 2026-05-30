// deck.gl accessors conflitam com tipos estritos do TS — runtime está correto.
// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { Crosshair, Plus, Minus, Box } from "lucide-react";
import { cn } from "@/lib/utils";
import { MapLegend } from "@/components/MapLegend";
import {
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

import {
  addMapControls,
  bindFarmPerimeterPopup,
  bindMapboxResize,
  bindStyleImageFallback,
  clearTerrain,
  defaultMapView,
  MAPBOX_TOKEN,
  paddedMaxBounds,
  runWhenMapReady,
  setupTerrain,
  syncMapboxPerimeter,
} from "@/lib/geo/mapbox-shared";

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

const apply3DView = (map: any, is3D: boolean) => {
  if (is3D) {
    setupTerrain(map);
    map.easeTo({ pitch: PITCH_3D, bearing: BEARING, duration: 700 });
    return;
  }
  clearTerrain(map);
  map.easeTo({ pitch: 0, bearing: BEARING, duration: 700 });
};

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
  const mapboxglRef = useRef<any>(null);
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
        mapboxglRef.current = mapboxgl;

        mapboxgl.accessToken = MAPBOX_TOKEN;
        const view = defaultMapView();
        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: BASEMAP_STYLES[basemap],
          ...view,
          maxBounds: paddedMaxBounds(),
          antialias: true,
          cooperativeGestures: true,
        });

        mapRef.current = map;
        bindStyleImageFallback(map);

        map.on("load", () => {
          if (cancelled) return;
          bindFarmPerimeterPopup(map, mapboxgl);
          addMapControls(map, mapboxgl, { scale: true, navigation: false });
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
    const container = containerRef.current;
    if (!container) return;
    return bindMapboxResize(container, () => mapRef.current);
  }, [ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map || prevBasemap.current === basemap) return;
    prevBasemap.current = basemap;
    setDeckReady(false);

    map.setStyle(BASEMAP_STYLES[basemap]);
    map.once("style.load", () => {
      bindStyleImageFallback(map);
      map.__prevagroPopupBound = false;
      map.__prevagroControlsBound = false;
      bindFarmPerimeterPopup(map, mapboxglRef.current);
      addMapControls(map, mapboxglRef.current, { scale: true, navigation: false });
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
    <div className={cn("relative overflow-hidden rounded-lg border border-border", className)}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full [&_.mapboxgl-ctrl-attrib]:text-[10px]" />

      {!ready && !failed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 text-sm text-muted-foreground">
          Carregando mapa…
        </div>
      )}
      {failed && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/90 px-6 text-center text-sm text-muted-foreground">
          Não foi possível carregar o mapa. Verifique o token Mapbox (VITE_MAPBOX_TOKEN) e a conexão.
        </div>
      )}

      <div className="pointer-events-none absolute inset-0">
        <div className="pointer-events-auto absolute right-3 top-3 flex flex-col gap-1 rounded-lg border border-border bg-background p-1">
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
