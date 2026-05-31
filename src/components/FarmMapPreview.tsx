// @ts-nocheck
import { useEffect, useRef, useState } from "react";
import "mapbox-gl/dist/mapbox-gl.css";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { BASEMAP_STYLES } from "@/lib/geo/map-layers";
import {
  addMapControls,
  bindFeaturePopup,
  bindMapboxResize,
  bindStyleImageFallback,
  defaultMapView,
  defaultMapViewFromBounds,
  MAPBOX_TOKEN,
  syncMapboxFeature,
} from "@/lib/geo/mapbox-shared";
import { riskScoreToFillColor, type GeoJsonFeature } from "@/lib/farm/polygon-utils";
import { SatelliteMap } from "@/components/SatelliteMap";

type FarmMapPreviewProps = {
  className?: string;
  riskScore?: number | null;
  feature?: GeoJsonFeature | null;
  bounds?: [[number, number], [number, number]] | null;
  maxBounds?: [[number, number], [number, number]] | null;
  farmLabel?: string;
  areaHa?: number | null;
  isLoading?: boolean;
};

export const FarmMapPreview = ({
  className,
  riskScore = null,
  feature = null,
  bounds = null,
  maxBounds = null,
  farmLabel = "Fazenda",
  areaHa = null,
  isLoading = false,
}: FarmMapPreviewProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [failed, setFailed] = useState(!MAPBOX_TOKEN);

  useEffect(() => {
    if (!MAPBOX_TOKEN || !containerRef.current || !feature || !bounds) return;

    let cancelled = false;

    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !containerRef.current) return;

        mapboxgl.accessToken = MAPBOX_TOKEN;
        const view = defaultMapViewFromBounds(bounds);

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: BASEMAP_STYLES.satellite,
          ...view,
          maxBounds: maxBounds ?? bounds,
          antialias: true,
          attributionControl: true,
          cooperativeGestures: true,
        });

        mapRef.current = map;
        bindStyleImageFallback(map);

        map.on("load", () => {
          if (cancelled) return;

          const fillColor = riskScoreToFillColor(riskScore);
          syncMapboxFeature(map, feature, {
            fillColor,
            fillOpacity: 0.42,
            lineColor: fillColor,
          });

          const areaLabel = areaHa != null ? `${areaHa} ha` : "—";
          bindFeaturePopup(
            map,
            mapboxgl,
            `
            <div class="prevagro-popup-body">
              <p class="prevagro-popup-title">${farmLabel}</p>
              <p class="prevagro-popup-sub">${areaLabel}</p>
              <hr class="prevagro-popup-divider" />
              <dl class="prevagro-popup-metrics">
                <div><dt>Risco</dt><dd>${riskScore ?? "—"}${riskScore != null ? "/100" : ""}</dd></div>
              </dl>
            </div>
          `,
          );

          addMapControls(map, mapboxgl, { scale: true, navigation: false });
          map.fitBounds(bounds, { padding: 48, duration: 0, maxZoom: 13 });
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
  }, [feature, bounds, maxBounds, riskScore, farmLabel, areaHa]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || failed) return;
    return bindMapboxResize(container, () => mapRef.current);
  }, [failed]);

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-border bg-surface/40",
          className,
        )}
      >
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Carregando mapa" />
      </div>
    );
  }

  if (failed || !MAPBOX_TOKEN || !feature || !bounds) {
    return <SatelliteMap className={className} compact />;
  }

  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-border", className)}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full [&_.mapboxgl-ctrl-attrib]:text-[10px]" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute bottom-3 left-3 rounded-md border border-border bg-background px-3 py-1.5 text-xs">
          <span className="text-muted-foreground">Risco </span>
          <span className="font-medium tabular-nums text-foreground">
            {riskScore != null ? `${riskScore}/100` : "—"}
          </span>
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
