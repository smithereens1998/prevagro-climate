import {
  FARM_CENTER,
  FARM_METRICS,
  FARM_PERIMETER,
  farmBounds,
  getRiskScore,
} from "./farm-data";

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

export const PERIMETER_SOURCE = "prevagro-perimeter";
export const PERIMETER_FILL = "prevagro-perimeter-fill";
export const PERIMETER_LINE = "prevagro-perimeter-line";
export const PERIMETER_GLOW = "prevagro-perimeter-glow";

/** Limita pan fora da região da fazenda (Mapbox maxBounds). */
export const paddedMaxBounds = (): [[number, number], [number, number]] => {
  const [[minLon, minLat], [maxLon, maxLat]] = farmBounds();
  const pad = 0.065;
  return [
    [minLon - pad, minLat - pad],
    [maxLon + pad, maxLat + pad],
  ];
};

export const bindStyleImageFallback = (map: any) => {
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

export const setupMapAtmosphere = (map: any, enabled: boolean) => {
  if (!map.isStyleLoaded?.()) return;
  try {
    if (enabled) {
      map.setFog({
        color: "#0c1a14",
        "high-color": "#1a3d2e",
        "horizon-blend": 0.12,
        "space-color": "#020408",
        "star-intensity": 0.12,
      });
    } else {
      map.setFog(null);
    }
  } catch {
    /* estilo sem suporte a fog */
  }
};

export const setupTerrain = (map: any) => {
  if (!map.getSource("mapbox-dem")) {
    map.addSource("mapbox-dem", {
      type: "raster-dem",
      url: "mapbox://mapbox.mapbox-terrain-dem-v1",
      tileSize: 512,
      maxzoom: 14,
    });
  }
  map.setTerrain({ source: "mapbox-dem", exaggeration: 1.4 });
  setupMapAtmosphere(map, true);
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

export const clearTerrain = (map: any) => {
  map.setTerrain(null);
  setupMapAtmosphere(map, false);
  if (map.getLayer("sky")) map.removeLayer("sky");
};

export const runWhenMapReady = (map: any, fn: () => void) => {
  if (!map) return;
  if (map.isStyleLoaded()) {
    fn();
    return;
  }
  map.once("idle", fn);
};

export const syncMapboxPerimeter = (map: any, is3D = false) => {
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
        /** Invisível — só área clicável para popup; cor vem das camadas de dados. */
        "fill-opacity": 0,
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
    map.setPaintProperty(PERIMETER_FILL, "fill-opacity", 0);
  }

  for (const id of [PERIMETER_FILL, PERIMETER_GLOW, PERIMETER_LINE]) {
    if (map.getLayer(id)) map.moveLayer(id);
  }
};

export const bindFarmPerimeterPopup = (map: any, mapboxgl: any) => {
  if (map.__prevagroPopupBound) return;
  map.__prevagroPopupBound = true;

  const props = FARM_PERIMETER.properties;
  const html = `
    <div class="prevagro-popup-body">
      <p class="prevagro-popup-title">${props.nome}</p>
      <p class="prevagro-popup-sub">${props.municipio}</p>
      <hr class="prevagro-popup-divider" />
      <dl class="prevagro-popup-metrics">
        <div><dt>Área</dt><dd>${props.hectares} ha</dd></div>
        <div><dt>Risco</dt><dd>${FARM_METRICS.risco} (${getRiskScore()}/100)</dd></div>
        <div><dt>NDVI</dt><dd>${FARM_METRICS.ndvi.toFixed(2)}</dd></div>
        <div><dt>Clima</dt><dd>${FARM_METRICS.temp.toFixed(1)} °C · ${FARM_METRICS.umidade}% umid.</dd></div>
      </dl>
    </div>
  `;

  map.on("click", PERIMETER_FILL, (e: { lngLat: { lng: number; lat: number } }) => {
    new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "300px",
      className: "prevagro-map-popup",
      offset: 12,
    })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  });

  map.on("mouseenter", PERIMETER_FILL, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", PERIMETER_FILL, () => {
    map.getCanvas().style.cursor = "";
  });
};

export const addMapControls = (
  map: any,
  mapboxgl: any,
  opts?: { navigation?: boolean; scale?: boolean; position?: "top-right" | "bottom-right" },
) => {
  if (map.__prevagroControlsBound) return;
  map.__prevagroControlsBound = true;
  const pos = opts?.position ?? "bottom-right";
  if (opts?.scale !== false) {
    map.addControl(new mapboxgl.ScaleControl({ maxWidth: 110, unit: "metric" }), pos);
  }
  if (opts?.navigation) {
    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
  }
};

export const defaultMapView = () => ({
  center: FARM_CENTER as [number, number],
  zoom: 11.2,
  bearing: -14,
  pitch: 0,
});

/** Recalcula o canvas quando o container muda (ex.: sidebar abre/fecha). */
export const bindMapboxResize = (container: HTMLElement, getMap: () => unknown) => {
  const resize = () => {
    const map = getMap() as { resize?: () => void; _removed?: boolean } | null;
    if (map?.resize && !map._removed) map.resize();
  };

  const observer = new ResizeObserver(() => resize());
  observer.observe(container);

  return () => {
    observer.disconnect();
  };
};

export type MapGeoJsonFeature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: { type: string; coordinates: unknown };
};

export const syncMapboxFeature = (
  map: any,
  feature: MapGeoJsonFeature | null,
  opts?: { fillColor?: string; fillOpacity?: number; lineColor?: string },
) => {
  if (!feature) return;

  const fillColor = opts?.fillColor ?? "#7CEC52";
  const fillOpacity = opts?.fillOpacity ?? 0.35;
  const lineColor = opts?.lineColor ?? fillColor;

  if (!map.getSource(PERIMETER_SOURCE)) {
    map.addSource(PERIMETER_SOURCE, { type: "geojson", data: feature });
  } else {
    map.getSource(PERIMETER_SOURCE).setData(feature);
  }

  if (!map.getLayer(PERIMETER_FILL)) {
    map.addLayer({
      id: PERIMETER_FILL,
      type: "fill",
      source: PERIMETER_SOURCE,
      paint: {
        "fill-color": fillColor,
        "fill-opacity": fillOpacity,
      },
    });
  } else {
    map.setPaintProperty(PERIMETER_FILL, "fill-color", fillColor);
    map.setPaintProperty(PERIMETER_FILL, "fill-opacity", fillOpacity);
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
        "line-color": lineColor,
        "line-width": 2.5,
        "line-opacity": 1,
      },
    });
  } else {
    map.setPaintProperty(PERIMETER_LINE, "line-color", lineColor);
  }

  for (const id of [PERIMETER_FILL, PERIMETER_GLOW, PERIMETER_LINE]) {
    if (map.getLayer(id)) map.moveLayer(id);
  }
};

export const defaultMapViewFromBounds = (
  bounds: [[number, number], [number, number]],
): { center: [number, number]; zoom: number; bearing: number; pitch: number } => {
  const [[minLon, minLat], [maxLon, maxLat]] = bounds;
  return {
    center: [(minLon + maxLon) / 2, (minLat + maxLat) / 2],
    zoom: 11.2,
    bearing: -14,
    pitch: 0,
  };
};

export const bindFeaturePopup = (
  map: any,
  mapboxgl: any,
  html: string,
  layerId = PERIMETER_FILL,
) => {
  if (map.__prevagroPopupBound) return;
  map.__prevagroPopupBound = true;

  map.on("click", layerId, (e: { lngLat: { lng: number; lat: number } }) => {
    new mapboxgl.Popup({
      closeButton: true,
      closeOnClick: true,
      maxWidth: "300px",
      className: "prevagro-map-popup",
      offset: 12,
    })
      .setLngLat(e.lngLat)
      .setHTML(html)
      .addTo(map);
  });

  map.on("mouseenter", layerId, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", layerId, () => {
    map.getCanvas().style.cursor = "";
  });
};
