import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  Sun,
  Wind,
} from "lucide-react";
import type { FarmMonitoringObservation, SeasonalForecastDay, SeasonalForecastDaily } from "./types";

export type ClimaKpi = {
  id: string;
  label: string;
  value: string;
  unit?: string;
  tone: "primary" | "warning" | "muted" | "default";
  icon: LucideIcon;
};

const formatNum = (value: number | null | undefined, digits = 1) => {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits).replace(".", ",");
};

export const buildClimaKpis = (
  forecast?: SeasonalForecastDaily | null,
  observation?: FarmMonitoringObservation | null,
): ClimaKpi[] => {
  const avgTemp = forecast?.summary?.avg_temp_c;
  const totalRain = forecast?.summary?.total_precip_mm;
  const humidity = observation?.weather.humidity_percent;
  const windMs = observation?.weather.wind_speed_mps;
  const windKmh = windMs != null ? windMs * 3.6 : null;
  const currentTemp = observation?.weather.temp_celsius;

  return [
    {
      id: "temp",
      label: "Temperatura Média",
      value:
        avgTemp != null
          ? formatNum(avgTemp)
          : currentTemp != null
            ? formatNum(currentTemp)
            : "—",
      unit: "°C",
      tone: (avgTemp ?? currentTemp) != null && (avgTemp ?? currentTemp)! >= 32 ? "warning" : "default",
      icon: Sun,
    },
    {
      id: "rain",
      label: "Chuva Acumulada",
      value: totalRain != null ? String(Math.round(totalRain)) : "—",
      unit: "mm",
      tone: totalRain != null && totalRain < 30 ? "warning" : "primary",
      icon: CloudRain,
    },
    {
      id: "humidity",
      label: "Umidade Relativa",
      value: humidity != null ? String(Math.round(humidity)) : "—",
      unit: "%",
      tone: "primary",
      icon: Droplets,
    },
    {
      id: "wind",
      label: "Velocidade do Vento",
      value: windKmh != null ? formatNum(windKmh) : "—",
      unit: "km/h",
      tone: "muted",
      icon: Wind,
    },
  ];
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const formatWeekdayLabel = (isoDate: string, index: number) => {
  if (index === 0) return "Hoje";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return `D${index + 1}`;
  return WEEKDAYS[date.getUTCDay()] ?? `D${index + 1}`;
};

const resolveWeatherVisual = (day: SeasonalForecastDay) => {
  const rain = day.precipitation_mm ?? 0;
  const temp = day.temp_mean_c ?? 24;

  if (day.dry_day_flag && rain < 1) {
    return temp >= 28
      ? { icon: Sun, label: "Ensolarado" }
      : { icon: Cloud, label: "Sem chuva" };
  }
  if (rain >= 15) return { icon: CloudLightning, label: "Chuva forte" };
  if (rain >= 5) return { icon: CloudRain, label: "Chuva" };
  if (rain > 0) return { icon: CloudRain, label: "Chuva leve" };
  if (temp <= 12) return { icon: CloudSnow, label: "Frio" };
  return { icon: Cloud, label: "Nublado" };
};

export type WeekForecastCard = {
  key: string;
  label: string;
  tempMax: number | null;
  tempMin: number | null;
  icon: LucideIcon;
  condition: string;
};

export const forecastToWeekCards = (forecast: SeasonalForecastDay[]): WeekForecastCard[] =>
  forecast.slice(0, 7).map((day, index) => {
    const visual = resolveWeatherVisual(day);
    return {
      key: day.forecast_date,
      label: formatWeekdayLabel(day.forecast_date, index),
      tempMax: day.temp_max_c ?? day.temp_mean_c,
      tempMin: day.temp_min_c ?? day.temp_mean_c,
      icon: visual.icon,
      condition: visual.label,
    };
  });

export const forecastToRainChart = (forecast: SeasonalForecastDay[]) =>
  forecast.map((day) => ({
    d: day.forecast_date.slice(8, 10),
    mm: Math.round(day.precipitation_mm ?? 0),
  }));

export const forecastToTempChart = (forecast: SeasonalForecastDay[]) =>
  forecast.map((day) => ({
    d: day.forecast_date.slice(8, 10),
    max: day.temp_max_c ?? day.temp_mean_c ?? 0,
    min: day.temp_min_c ?? day.temp_mean_c ?? 0,
  }));

export const buildHorizonRiskSummary = (
  heatScore: number | null,
  waterScore: number | null,
): string | null => {
  if (heatScore == null && waterScore == null) return null;
  const heat = heatScore ?? 0;
  const water = waterScore ?? 0;
  const avg = Math.round((heat + water) / 2);

  if (avg >= 67) {
    return `Cenário crítico para os próximos 30 dias: risco térmico ${heat}/100 e estresse hídrico ${water}/100.`;
  }
  if (avg >= 34) {
    return `Atenção nos próximos 30 dias: risco térmico ${heat}/100 e estresse hídrico ${water}/100.`;
  }
  return `Cenário favorável nos próximos 30 dias: risco térmico ${heat}/100 e estresse hídrico ${water}/100.`;
};
