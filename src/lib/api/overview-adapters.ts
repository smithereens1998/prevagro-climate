import type {
  AgroSoilResponse,
  AgroWeatherResponse,
  HorizonFeaturesSnapshot,
  HorizonHistoryPoint,
  SatelliteHistoryItem,
  SeasonalForecastDaily,
  SeasonalForecastDay,
} from "./types";
import { horizonToRiskScore } from "./adapters";
import type { OverviewKpi, OverviewKpiId } from "@/lib/farm-insights";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const formatMonthLabel = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return isoDate.slice(0, 7);
  return MONTHS[date.getUTCMonth()] ?? isoDate.slice(5, 7);
};

const formatValue = (value: number | null | undefined, digits = 1) => {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits).replace(".", ",");
};

const kpiMeta: Record<
  OverviewKpiId,
  { label: string; unit?: string; tone: OverviewKpi["tone"] }
> = {
  risco: { label: "Risco Climático", unit: "/100", tone: "warning" },
  ndvi: { label: "Estresse Hídrico (30d)", unit: "/100", tone: "primary" },
  umidade: { label: "Umidade Relativa", unit: "%", tone: "primary" },
  temp: { label: "Temperatura Atual", unit: "°C", tone: "default" },
  solo: { label: "Umidade do Solo", unit: "%", tone: "default" },
};

export const buildOverviewKpisFromApi = (
  horizon?: HorizonFeaturesSnapshot,
  weather?: AgroWeatherResponse,
  soil?: AgroSoilResponse,
): OverviewKpi[] => {
  const riskScore = horizonToRiskScore(horizon);
  const water30 =
    horizon?.features?.["30d"]?.water_stress_score ??
    horizon?.features?.["12m"]?.water_stress_score;
  const waterScore = water30 != null ? Math.round(water30 * 100) : null;

  const values: Record<OverviewKpiId, string> = {
    risco: riskScore != null ? String(riskScore) : "—",
    ndvi: waterScore != null ? String(waterScore) : "—",
    umidade:
      weather?.main?.humidity != null
        ? String(Math.round(weather.main.humidity))
        : "—",
    temp:
      weather?.main?.temp_celsius != null
        ? formatValue(weather.main.temp_celsius)
        : "—",
    solo:
      soil?.moisture != null
        ? String(Math.round(soil.moisture * 100))
        : "—",
  };

  return (Object.keys(kpiMeta) as OverviewKpiId[]).map((id) => ({
    id,
    label: kpiMeta[id].label,
    value: values[id],
    unit: kpiMeta[id].unit,
    delta: 0,
    tone: kpiMeta[id].tone,
  }));
};

const formatDayLabel = (isoDate: string) => {
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate.slice(5, 10);
  return `${date.getUTCDate()}/${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
};

const heatScoreFromTemp = (temp: number | null | undefined) => {
  if (temp == null || Number.isNaN(temp)) return null;
  return Math.round(Math.min(Math.max((temp - 24) / 12, 0), 1) * 100);
};

const waterScoreFromDay = (precip: number | null | undefined, dryDay: boolean) => {
  if (dryDay) return 90;
  if (precip == null || Number.isNaN(precip)) return null;
  const dryness = Math.min(Math.max((5 - precip) / 5, 0), 1);
  return Math.round(dryness * 100);
};

export const seasonalForecastToClimateSeries = (forecast: SeasonalForecastDay[]) =>
  forecast.map((point) => ({
    m: formatDayLabel(point.forecast_date),
    temp: point.temp_mean_c ?? 0,
    chuva: point.precipitation_mm ?? 0,
  }));

export const seasonalForecastToRiskSeries = (forecast: SeasonalForecastDay[]) =>
  forecast.map((point) => ({
    m: formatDayLabel(point.forecast_date),
    calor: heatScoreFromTemp(point.temp_mean_c) ?? 0,
    agua: waterScoreFromDay(point.precipitation_mm, point.dry_day_flag) ?? 0,
  }));

export type Forecast30Metric = {
  key: string;
  label: string;
  value: string;
  tone: "default" | "warning" | "primary" | "destructive";
};

export const buildForecast30Metrics = (data?: SeasonalForecastDaily | null): Forecast30Metric[] => {
  const summary = data?.summary;
  const avgTemp = summary?.avg_temp_c;
  const totalRain = summary?.total_precip_mm;
  const dryDays = summary?.dry_days ?? 0;

  return [
    {
      key: "temp",
      label: "Temp. média",
      value: avgTemp != null ? `${avgTemp.toFixed(1).replace(".", ",")} °C` : "—",
      tone:
        avgTemp != null && avgTemp >= 32 ? "destructive" : avgTemp != null && avgTemp >= 28 ? "warning" : "default",
    },
    {
      key: "rain",
      label: "Chuva acum.",
      value: totalRain != null ? `${Math.round(totalRain)} mm` : "—",
      tone: totalRain != null && totalRain < 30 ? "warning" : "primary",
    },
    {
      key: "dry",
      label: "Dias secos",
      value: summary ? String(dryDays) : "—",
      tone: dryDays >= 15 ? "destructive" : dryDays >= 8 ? "warning" : "default",
    },
  ];
};

const pickHorizonPoints = (history: HorizonHistoryPoint[], horizonMonths = 6) =>
  history.filter((p) => p.horizon_months === horizonMonths);

export const historyToClimateSeries = (history: HorizonHistoryPoint[]) => {
  const points = pickHorizonPoints(history, 6);
  const byDate = new Map<string, HorizonHistoryPoint>();
  for (const point of points) {
    byDate.set(point.reference_date, point);
  }

  return [...byDate.values()]
    .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
    .slice(-12)
    .map((point) => ({
      m: formatMonthLabel(point.reference_date),
      temp: point.projected_avg_temp_c ?? 0,
      chuva: point.projected_total_precip_mm ?? 0,
    }));
};

export const historyToRiskSeries = (history: HorizonHistoryPoint[]) => {
  const points = pickHorizonPoints(history, 6);
  const byDate = new Map<string, HorizonHistoryPoint>();
  for (const point of points) {
    byDate.set(point.reference_date, point);
  }

  return [...byDate.values()]
    .sort((a, b) => a.reference_date.localeCompare(b.reference_date))
    .slice(-12)
    .map((point) => ({
      m: formatMonthLabel(point.reference_date),
      calor: Math.round((point.heat_risk_score ?? 0) * 100),
      agua: Math.round((point.water_stress_score ?? 0) * 100),
    }));
};

export const horizonHorizonsSummary = (horizon?: HorizonFeaturesSnapshot) => {
  const f6 = horizon?.features?.["6m"];
  const f12 = horizon?.features?.["12m"];
  return [
    {
      id: "6m",
      label: "Horizonte 6 meses",
      heat: f6?.heat_risk_score != null ? Math.round(f6.heat_risk_score * 100) : null,
      water: f6?.water_stress_score != null ? Math.round(f6.water_stress_score * 100) : null,
      precip: f6?.projected_total_precip_mm ?? null,
    },
    {
      id: "12m",
      label: "Horizonte 12 meses",
      heat: f12?.heat_risk_score != null ? Math.round(f12.heat_risk_score * 100) : null,
      water: f12?.water_stress_score != null ? Math.round(f12.water_stress_score * 100) : null,
      precip: f12?.projected_total_precip_mm ?? null,
    },
  ];
};

const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const extractNdvi = (item: SatelliteHistoryItem): number | null => {
  const stats = item.stats;
  if (stats) {
    for (const key of ["ndvi", "mean", "NDVI"]) {
      const value = stats[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
  }
  const imageNdvi = item.image?.ndvi;
  if (typeof imageNdvi === "number" && Number.isFinite(imageNdvi)) return imageNdvi;
  return null;
};

const formatSatelliteLabel = (item: SatelliteHistoryItem) => {
  if (item.dt) {
    const date = new Date(item.dt * 1000);
    if (!Number.isNaN(date.getTime())) return MONTHS_SHORT[date.getUTCMonth()] ?? String(date.getUTCDate());
  }
  if (item.date) return item.date.slice(5, 10);
  return "—";
};

export const satelliteToNdviSeries = (history: SatelliteHistoryItem[]) =>
  history
    .map((item) => ({
      m: formatSatelliteLabel(item),
      ndvi: extractNdvi(item),
      sortKey: item.dt ?? 0,
    }))
    .filter((point) => point.ndvi != null)
    .sort((a, b) => a.sortKey - b.sortKey)
    .slice(-12)
    .map(({ m, ndvi }) => ({ m, ndvi: Number(ndvi!.toFixed(2)) }));

export const averageNdvi = (history: SatelliteHistoryItem[]) => {
  const series = satelliteToNdviSeries(history);
  if (!series.length) return null;
  const sum = series.reduce((acc, point) => acc + point.ndvi, 0);
  return Number((sum / series.length).toFixed(2));
};
