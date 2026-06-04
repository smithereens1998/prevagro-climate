import type { SeasonalForecastDay } from "@/lib/api/types";

export type WeatherCondition =
  | "sunny"
  | "partly_cloudy"
  | "cloudy"
  | "light_rain"
  | "rain"
  | "storm"
  | "cold";

export const weatherConditionLabel: Record<WeatherCondition, string> = {
  sunny: "Ensolarado",
  partly_cloudy: "Parcialmente nublado",
  cloudy: "Nublado",
  light_rain: "Chuva leve",
  rain: "Chuva",
  storm: "Tempestade",
  cold: "Frio",
};

export const resolveWeatherCondition = (day: SeasonalForecastDay): WeatherCondition => {
  const rain = day.precipitation_mm ?? 0;
  const temp = day.temp_mean_c ?? day.temp_max_c ?? 24;

  if (rain >= 18) return "storm";
  if (rain >= 8) return "rain";
  if (rain >= 2) return "light_rain";
  if (temp <= 12) return "cold";
  if (day.dry_day_flag && rain < 1) {
    if (temp >= 30) return "sunny";
    if (temp >= 24) return "partly_cloudy";
    return "cloudy";
  }
  if (rain > 0) return "light_rain";
  if (temp >= 28) return "partly_cloudy";
  return "cloudy";
};
