import type { OverviewKpiId } from "@/lib/farm-insights";
import type { Forecast30Metric } from "@/lib/api/overview-adapters";

export type MetricVisualBand = {
  label: string;
  borderClass: string;
  bgClass: string;
  iconBgClass: string;
  iconTextClass: string;
  badgeClass: string;
  valueClass: string;
};

const favorable: MetricVisualBand = {
  label: "Favorável",
  borderClass: "border-l-emerald-500",
  bgClass: "bg-emerald-500/5",
  iconBgClass: "bg-emerald-500/15",
  iconTextClass: "text-emerald-600 dark:text-emerald-400",
  badgeClass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  valueClass: "text-emerald-700 dark:text-emerald-300",
};

const attention: MetricVisualBand = {
  label: "Atenção",
  borderClass: "border-l-amber-500",
  bgClass: "bg-amber-500/5",
  iconBgClass: "bg-amber-500/15",
  iconTextClass: "text-amber-600 dark:text-amber-400",
  badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  valueClass: "text-amber-700 dark:text-amber-300",
};

const critical: MetricVisualBand = {
  label: "Crítico",
  borderClass: "border-l-red-500",
  bgClass: "bg-red-500/5",
  iconBgClass: "bg-red-500/15",
  iconTextClass: "text-red-600 dark:text-red-400",
  badgeClass: "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
  valueClass: "text-red-700 dark:text-red-300",
};

const neutral: MetricVisualBand = {
  label: "Neutro",
  borderClass: "border-l-muted-foreground/40",
  bgClass: "bg-muted/30",
  iconBgClass: "bg-muted",
  iconTextClass: "text-muted-foreground",
  badgeClass: "border-border bg-muted/50 text-muted-foreground",
  valueClass: "text-foreground",
};

const cold: MetricVisualBand = {
  label: "Frio",
  borderClass: "border-l-sky-500",
  bgClass: "bg-sky-500/5",
  iconBgClass: "bg-sky-500/15",
  iconTextClass: "text-sky-600 dark:text-sky-400",
  badgeClass: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  valueClass: "text-sky-700 dark:text-sky-300",
};

const hot: MetricVisualBand = {
  label: "Calor",
  borderClass: "border-l-orange-500",
  bgClass: "bg-orange-500/5",
  iconBgClass: "bg-orange-500/15",
  iconTextClass: "text-orange-600 dark:text-orange-400",
  badgeClass: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  valueClass: "text-orange-700 dark:text-orange-300",
};

const balanced: MetricVisualBand = {
  label: "Equilibrado",
  borderClass: "border-l-teal-500",
  bgClass: "bg-teal-500/5",
  iconBgClass: "bg-teal-500/15",
  iconTextClass: "text-teal-600 dark:text-teal-400",
  badgeClass: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
  valueClass: "text-teal-700 dark:text-teal-300",
};

const high: MetricVisualBand = {
  label: "Alto",
  borderClass: "border-l-blue-500",
  bgClass: "bg-blue-500/5",
  iconBgClass: "bg-blue-500/15",
  iconTextClass: "text-blue-600 dark:text-blue-400",
  badgeClass: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300",
  valueClass: "text-blue-700 dark:text-blue-300",
};

const dry: MetricVisualBand = {
  label: "Seco",
  borderClass: "border-l-amber-500",
  bgClass: "bg-amber-500/5",
  iconBgClass: "bg-amber-500/15",
  iconTextClass: "text-amber-600 dark:text-amber-400",
  badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  valueClass: "text-amber-700 dark:text-amber-300",
};

const lowSoil: MetricVisualBand = {
  label: "Baixo",
  borderClass: "border-l-amber-500",
  bgClass: "bg-amber-500/5",
  iconBgClass: "bg-amber-500/15",
  iconTextClass: "text-amber-600 dark:text-amber-400",
  badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  valueClass: "text-amber-700 dark:text-amber-300",
};

const mediumSoil: MetricVisualBand = {
  label: "Médio",
  borderClass: "border-l-primary/60",
  bgClass: "bg-primary/5",
  iconBgClass: "bg-primary/15",
  iconTextClass: "text-primary",
  badgeClass: "border-primary/30 bg-primary/10 text-primary",
  valueClass: "text-primary",
};

const parseNumber = (value: string): number | null => {
  if (value === "—") return null;
  const normalized = value.replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const riskBand = (score: number): MetricVisualBand => {
  if (score <= 33) return favorable;
  if (score <= 66) return attention;
  return critical;
};

export const getKpiVisual = (id: OverviewKpiId, value: string): MetricVisualBand => {
  const num = parseNumber(value);
  if (num == null) return neutral;

  switch (id) {
    case "risco":
    case "ndvi":
      return riskBand(num);
    case "temp":
      if (num < 24) return cold;
      if (num > 32) return hot;
      return neutral;
    case "umidade":
      if (num < 30) return dry;
      if (num > 70) return high;
      return balanced;
    case "solo":
      if (num < 30) return lowSoil;
      if (num > 70) return high;
      return mediumSoil;
    default:
      return neutral;
  }
};

export const getForecastMetricVisual = (metric: Forecast30Metric): MetricVisualBand => {
  if (metric.value === "—") return neutral;

  switch (metric.tone) {
    case "destructive":
      return critical;
    case "warning":
      return attention;
    case "primary":
      return balanced;
    default:
      return neutral;
  }
};
