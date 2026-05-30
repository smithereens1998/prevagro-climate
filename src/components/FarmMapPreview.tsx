// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { farmBounds, makeHeatGeoJSON, getRiskScore } from "@/lib/geo/farm-data";
import { BASEMAP_STYLES } from "@/lib/geo/map-layers";
import { heatmapColorExpression, RISK_RANGE } from "@/lib/geo/map-colors";
import {
  addMapControls,
  bindFarmPerimeterPopup,
  bindMapboxResize,
  bindStyleImageFallback,
  defaultMapView,
  MAPBOX_TOKEN,
  paddedMaxBounds,
  syncMapboxPerimeter,
} from "@/lib/geo/mapbox-shared";
import { SatelliteMap } from "@/components/SatelliteMap";

const PREVIEW_HEAT_SOURCE = "prevagro-preview-risk";
const PREVIEW_HEAT_LAYER = "prevagro-preview-risk-heat";

type FarmMapPreviewProps = {
  className?: string;
};

/** Mapbox GL nativo — preview na visão geral (satélite + risco + perímetro). */
export const FarmMapPreview = ({ className }: FarmMapPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [failed, setFailed] = useState(!MAPBOX_TOKEN);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current) return;

    let cancelled = false;

    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !containerRef.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;
        const view = defaultMapView();

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: BASEMAP_STYLES.satellite,
          ...view,
          maxBounds: paddedMaxBounds(),
          antialias: true,
          attributionControl: true,
          cooperativeGestures: true,
        });

        mapRef.current = map;
        bindStyleImageFallback(map);

        map.on("load", () => {
          if (cancelled) return;

          map.addSource(PREVIEW_HEAT_SOURCE, {
            type: "geojson",
            data: makeHeatGeoJSON("riscoScore"),
          });
          map.addLayer({
            id: PREVIEW_HEAT_LAYER,
            type: "heatmap",
            source: PREVIEW_HEAT_SOURCE,
            paint: {
              "heatmap-weight": ["get", "weight"],
              "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 10, 0.85, 13, 1.35],
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 10, 26, 13, 44],
              "heatmap-opacity": 0.78,
              "heatmap-color": heatmapColorExpression(RISK_RANGE),
            },
          });

          syncMapboxPerimeter(map, false);
          bindFarmPerimeterPopup(map, mapboxgl);
          addMapControls(map, mapboxgl, { scale: true, navigation: false });

          map.fitBounds(farmBounds(), { padding: 48, duration: 0, maxZoom: 13 });
          setFailed(false);
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || failed) return;
    return bindMapboxResize(container, () => mapRef.current);
  }, [failed]);

  if (failed) {
    return <SatelliteMap className={className} compact />;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border", className)}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full [&_.mapboxgl-ctrl-attrib]:text-[10px]" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">Risco</span>
          <span className="h-2 w-16 rounded-full bg-gradient-to-r from-primary via-warning to-destructive" />
          <span className="font-medium text-foreground">{getRiskScore()}/100</span>
        </div>
        <Link
          to="/mapa"
          className="pointer-events-auto absolute top-3 right-3 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
          aria-label="Abrir mapa completo"
        >
          Mapa completo →
        </Link>
      </div>
    </div>
  );
};
