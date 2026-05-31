import type {
  AgroSoilResponse,
  FarmMonitoringObservation,
  HorizonFeaturesHistory,
  HorizonFeaturesSnapshot,
  LlmPrediction,
} from "./types";

const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const asPercent = (value: number | null | undefined) => {
  if (value == null || Number.isNaN(value)) return null;
  return value * 100;
};

const asNumber = (value: number | null | undefined, digits = 1) => {
  if (value == null || Number.isNaN(value)) return null;
  return Number(value.toFixed(digits));
};

const formatMetric = (value: number | null | undefined, unit = "", digits = 1) => {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits).replace(".", ",")}${unit}`;
};

const monthLabel = (isoDate: string) => {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate.slice(5, 10);
  return `${MONTHS_SHORT[date.getUTCMonth()] ?? "—"}/${String(date.getUTCFullYear()).slice(2)}`;
};

export type SoloKpi = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  tone: "primary" | "warning" | "danger" | "muted";
};

export const buildSoloKpis = (
  observation?: FarmMonitoringObservation | null,
  agroSoil?: AgroSoilResponse | null,
  horizon?: HorizonFeaturesSnapshot | null,
): SoloKpi[] => {
  const soilMoisturePct = asPercent(observation?.soil?.moisture ?? agroSoil?.moisture);
  const surfaceTemp = asNumber(
    observation?.soil?.temp_surface_celsius ?? agroSoil?.temperature_celsius?.t0_celsius,
  );
  const temp10cm = asNumber(agroSoil?.temperature_celsius?.t10_celsius);
  const waterStress = asPercent(horizon?.features?.["30d"]?.water_stress_score);

  return [
    {
      id: "soil-moisture",
      label: "Umidade do Solo",
      value: formatMetric(soilMoisturePct, "", 0),
      unit: "%",
      tone: soilMoisturePct != null && soilMoisturePct < 20 ? "danger" : "primary",
    },
    {
      id: "surface-temp",
      label: "Temp. Superfície",
      value: formatMetric(surfaceTemp),
      unit: "°C",
      tone: surfaceTemp != null && surfaceTemp >= 35 ? "warning" : "muted",
    },
    {
      id: "temp-10cm",
      label: "Temp. Solo 10cm",
      value: formatMetric(temp10cm),
      unit: "°C",
      tone: temp10cm != null && temp10cm >= 30 ? "warning" : "muted",
    },
    {
      id: "water-stress-30d",
      label: "Estresse Hídrico 30d",
      value: formatMetric(waterStress, "", 0),
      unit: "/100",
      tone: waterStress != null && waterStress >= 70 ? "danger" : "warning",
    },
  ];
};

export const buildSoilCompositionBars = (
  observation?: FarmMonitoringObservation | null,
  agroSoil?: AgroSoilResponse | null,
  horizon?: HorizonFeaturesSnapshot | null,
) => {
  const moisture = asPercent(observation?.soil?.moisture ?? agroSoil?.moisture);
  const t0 = asNumber(
    observation?.soil?.temp_surface_celsius ?? agroSoil?.temperature_celsius?.t0_celsius,
  );
  const t10 = asNumber(agroSoil?.temperature_celsius?.t10_celsius);
  const stress = asPercent(horizon?.features?.["30d"]?.water_stress_score);

  return [
    { n: "Umidade", v: moisture ?? 0 },
    { n: "Temp t0", v: t0 ?? 0 },
    { n: "Temp 10cm", v: t10 ?? 0 },
    { n: "Estresse 30d", v: stress ?? 0 },
  ];
};

export const buildSoilTrendSeries = (history?: HorizonFeaturesHistory | null) => {
  const source = history?.history ?? [];
  if (!source.length) return [];

  return source
    .filter((point) => point.horizon_months === 1 && point.baseline_avg_soil_moisture != null)
    .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
    .slice(-12)
    .map((point) => ({
      m: monthLabel(point.reference_date),
      q: Number((point.baseline_avg_soil_moisture! * 100).toFixed(1)),
    }));
};

export type SoloSuggestion = {
  title: string;
  description: string;
  severity: "primary" | "warning" | "danger";
};

export const buildSoloSuggestions = (
  llmPrediction: LlmPrediction | null | undefined,
  observation?: FarmMonitoringObservation | null,
  horizon?: HorizonFeaturesSnapshot | null,
): SoloSuggestion[] => {
  if (llmPrediction?.acoes_recomendadas?.length) {
    return llmPrediction.acoes_recomendadas.slice(0, 3).map((action) => {
      const severity =
        action.prioridade === "alta"
          ? "danger"
          : action.prioridade === "media"
            ? "warning"
            : "primary";
      return {
        title: action.acao,
        description: `${action.objetivo} · Prazo: ${action.prazo}`,
        severity,
      };
    });
  }

  const moisture = asPercent(observation?.soil?.moisture);
  const stress = asPercent(horizon?.features?.["30d"]?.water_stress_score);
  const suggestions: SoloSuggestion[] = [];

  if (moisture != null && moisture < 20) {
    suggestions.push({
      title: "Priorizar irrigação de recuperação",
      description:
        "Umidade de solo abaixo de 20%. Aumente frequência de monitoramento até estabilizar.",
      severity: "danger",
    });
  }
  if (stress != null && stress >= 70) {
    suggestions.push({
      title: "Plano hídrico para 30 dias",
      description:
        "Estresse hídrico projetado elevado. Planeje lâmina e janelas de irrigação por talhão.",
      severity: "warning",
    });
  }
  suggestions.push({
    title: "Conferir temperatura de solo",
    description: "Acompanhe t0 e t10 para ajustar horário de irrigação e reduzir evaporação.",
    severity: "primary",
  });

  return suggestions.slice(0, 3);
};
