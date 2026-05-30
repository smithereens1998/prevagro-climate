import {
  FARM_METRICS,
  type FarmMetricKey,
} from "./farm-data";
import {
  ndviColor,
  prodColor,
  riscoColor,
  RISK_RANGE,
  soloColor,
  TEMP_RANGE,
  tempColor,
  toRgba,
  UMID_RANGE,
  umidColor,
  type ColorRange,
  type RGB,
} from "./map-colors";

export const LAYER_IDS = [
  "Vegetação",
  "Temperatura",
  "Umidade",
  "Solo",
  "Risco Climático",
  "Produtividade",
] as const;

export type LayerId = (typeof LAYER_IDS)[number];

export type VizKind = "geometry" | "heatmap" | "columns";

export type VizMode = "auto" | "heatmap" | "geometry" | "columns";

export type BasemapId = "satellite" | "terrain" | "dark";

/** satellite-v9 evita sprites de rótulos (ex.: br-state-4) que geram warnings. */
export const BASEMAP_STYLES: Record<BasemapId, string> = {
  satellite: "mapbox://styles/mapbox/satellite-v9",
  terrain: "mapbox://styles/mapbox/outdoors-v12",
  dark: "mapbox://styles/mapbox/dark-v11",
};

export type LegendItem = {
  layerId: LayerId;
  title: string;
  minLabel: string;
  maxLabel: string;
  stops: RGB[];
  unit?: string;
};

type LayerMeta = {
  defaultViz: VizKind;
  heatMetric: FarmMetricKey;
  colorRange?: ColorRange;
  legend: Omit<LegendItem, "layerId">;
  geometryColor: () => RGB;
  columnValue?: () => number;
};

export const LAYER_META: Record<LayerId, LayerMeta> = {
  Vegetação: {
    defaultViz: "geometry",
    heatMetric: "ndvi",
    legend: {
      title: "NDVI (vegetação)",
      minLabel: "Baixo",
      maxLabel: "Alto",
      stops: [[180, 83, 9], [234, 179, 8], [34, 197, 94]],
    },
    geometryColor: () => ndviColor(FARM_METRICS.ndvi),
  },
  Temperatura: {
    defaultViz: "heatmap",
    heatMetric: "temp",
    colorRange: TEMP_RANGE,
    legend: {
      title: "Temperatura",
      minLabel: "24°C",
      maxLabel: "36°C",
      stops: [TEMP_RANGE[0], TEMP_RANGE[2], TEMP_RANGE[5]],
      unit: "°C",
    },
    geometryColor: () => tempColor(FARM_METRICS.temp),
  },
  Umidade: {
    defaultViz: "heatmap",
    heatMetric: "umidade",
    colorRange: UMID_RANGE,
    legend: {
      title: "Umidade do solo",
      minLabel: "Seco",
      maxLabel: "Úmido",
      stops: [UMID_RANGE[0], UMID_RANGE[3], UMID_RANGE[5]],
      unit: "%",
    },
    geometryColor: () => umidColor(FARM_METRICS.umidade),
  },
  Solo: {
    defaultViz: "geometry",
    heatMetric: "soloScore",
    legend: {
      title: "Qualidade do solo",
      minLabel: "Baixa",
      maxLabel: "Alta",
      stops: [[92, 64, 38], [139, 105, 70], [186, 134, 86]],
    },
    geometryColor: () => soloColor(FARM_METRICS.soloScore),
  },
  "Risco Climático": {
    defaultViz: "heatmap",
    heatMetric: "riscoScore",
    colorRange: RISK_RANGE,
    legend: {
      title: "Risco climático",
      minLabel: "Baixo",
      maxLabel: "Alto",
      stops: [RISK_RANGE[0], RISK_RANGE[3], RISK_RANGE[5]],
    },
    geometryColor: () => riscoColor(FARM_METRICS.riscoScore),
  },
  Produtividade: {
    defaultViz: "columns",
    heatMetric: "produtividade",
    legend: {
      title: "Produtividade",
      minLabel: "55 sc/ha",
      maxLabel: "100 sc/ha",
      stops: [[132, 204, 120], [74, 180, 100], [22, 163, 74]],
      unit: "sc/ha",
    },
    geometryColor: () => prodColor(FARM_METRICS.produtividade),
    columnValue: () => FARM_METRICS.produtividade,
  },
};

export const resolveVizKind = (layerId: LayerId, mode: VizMode): VizKind => {
  if (mode === "auto") return LAYER_META[layerId].defaultViz;
  if (mode === "heatmap") return "heatmap";
  if (mode === "geometry") return "geometry";
  return LAYER_META[layerId].columnValue ? "columns" : "geometry";
};

export const getLegendsForLayers = (active: string[]): LegendItem[] =>
  active
    .filter((id): id is LayerId => LAYER_IDS.includes(id as LayerId))
    .map((layerId) => ({ layerId, ...LAYER_META[layerId].legend }));

export const fillColorForLayer = (layerId: LayerId, opacity: number) =>
  toRgba(LAYER_META[layerId].geometryColor(), opacity);
