import type { AgroSoilResponse, AgroWeatherResponse, SatelliteHistoryItem } from "@/lib/api/types";
import { averageNdvi } from "@/lib/api/overview-adapters";
import type { LayerId } from "./map-layers";
import { LAYER_IDS } from "./map-layers";
import {
  ndviColor,
  riscoColor,
  soloColor,
  tempColor,
  umidColor,
  type RGB,
} from "./map-colors";
import {
  FARM_METRICS,
  type FarmMetricKey,
  type FarmMetrics,
} from "./farm-data";

export type LayerMetricsInput = {
  weather?: AgroWeatherResponse | null;
  soil?: AgroSoilResponse | null;
  satellite?: SatelliteHistoryItem[] | null;
  riskScore?: number | null;
};

export type LayerMetricLabel = {
  value: string;
  subtitle: string;
  fromApi: boolean;
};

export const buildLayerMetricsFromApi = (input: LayerMetricsInput): FarmMetrics => {
  const temp = input.weather?.main?.temp_celsius ?? FARM_METRICS.temp;
  const umidade = input.weather?.main?.humidity ?? FARM_METRICS.umidade;
  const ndviAvg = input.satellite ? averageNdvi(input.satellite) : null;
  const ndvi = ndviAvg ?? FARM_METRICS.ndvi;
  const soloScore =
    input.soil?.moisture != null
      ? Math.max(0, Math.min(1, input.soil.moisture))
      : FARM_METRICS.soloScore;
  const riscoScore =
    input.riskScore != null
      ? Math.max(0, Math.min(1, input.riskScore / 100))
      : FARM_METRICS.riscoScore;

  const risco: FarmMetrics["risco"] =
    riscoScore >= 0.66 ? "Alto" : riscoScore >= 0.4 ? "Médio" : "Baixo";

  return { ndvi, temp, umidade, soloScore, riscoScore, risco };
};

export const layerMetricValue = (metrics: FarmMetrics, metric: FarmMetricKey): number =>
  metrics[metric];

export const layerGeometryColor = (layerId: string, metrics: FarmMetrics): RGB => {
  switch (layerId) {
    case "Vegetação":
      return ndviColor(metrics.ndvi);
    case "Temperatura":
      return tempColor(metrics.temp);
    case "Umidade":
      return umidColor(metrics.umidade);
    case "Solo":
      return soloColor(metrics.soloScore);
    case "Risco Climático":
      return riscoColor(metrics.riscoScore);
    default:
      return tempColor(metrics.temp);
  }
};

export const buildLayerMetricLabels = (input: LayerMetricsInput): Record<LayerId, LayerMetricLabel> => {
  const metrics = buildLayerMetricsFromApi(input);
  const ndviAvg = input.satellite ? averageNdvi(input.satellite) : null;
  const temp = input.weather?.main?.temp_celsius;
  const humidity = input.weather?.main?.humidity;
  const soilMoisture = input.soil?.moisture;
  const riskScore = input.riskScore;

  const labels = {} as Record<LayerId, LayerMetricLabel>;

  for (const layerId of LAYER_IDS) {
    switch (layerId) {
      case "Vegetação":
        labels[layerId] = ndviAvg != null
          ? {
              value: ndviAvg.toFixed(2),
              subtitle: "NDVI médio · satélite",
              fromApi: true,
            }
          : {
              value: "—",
              subtitle: "Sem histórico satelital",
              fromApi: false,
            };
        break;
      case "Temperatura":
        labels[layerId] = temp != null
          ? {
              value: `${temp.toFixed(1)} °C`,
              subtitle: "Temperatura atual · clima",
              fromApi: true,
            }
          : {
              value: `${metrics.temp.toFixed(1)} °C`,
              subtitle: "Aguardando clima",
              fromApi: false,
            };
        break;
      case "Umidade":
        labels[layerId] = humidity != null
          ? {
              value: `${Math.round(humidity)} %`,
              subtitle: "Umidade relativa · clima",
              fromApi: true,
            }
          : {
              value: `${Math.round(metrics.umidade)} %`,
              subtitle: "Aguardando clima",
              fromApi: false,
            };
        break;
      case "Solo":
        labels[layerId] = soilMoisture != null
          ? {
              value: `${Math.round(soilMoisture * 100)} %`,
              subtitle: "Umidade do solo · AgroMonitoring",
              fromApi: true,
            }
          : {
              value: "—",
              subtitle: "Aguardando solo",
              fromApi: false,
            };
        break;
      case "Risco Climático":
        labels[layerId] = riskScore != null
          ? {
              value: `${Math.round(riskScore)}/100 · ${metrics.risco}`,
              subtitle: "Score horizon · pipeline",
              fromApi: true,
            }
          : {
              value: `${Math.round(metrics.riscoScore * 100)}/100`,
              subtitle: "Aguardando horizon",
              fromApi: false,
            };
        break;
    }
  }

  return labels;
};
