import {
  FARM_CROPS,
  FARM_KPI_DELTAS,
  FARM_METRICS,
  FARM_PERIMETER,
  FARM_SNAPSHOT,
  getCropSharePct,
  getRiskBreakdown,
  getRiskScore,
  getWeightedNdvi,
  type FarmCrop,
} from "@/lib/geo/farm-data";

export const FARM_NAME = FARM_PERIMETER.properties.nome;
export const FARM_MUNICIPIO = FARM_PERIMETER.properties.municipio;
export const FARM_HECTARES = FARM_PERIMETER.properties.hectares;
export const FARM_SAFRA = FARM_PERIMETER.properties.safra;
export const RISK_SCORE = getRiskScore();
export const WEIGHTED_NDVI = getWeightedNdvi();

export type CropFocus = FarmCrop & { sharePct: number };

/** Culturas em foco com participação calculada a partir do mock. */
export const CROP_FOCUS: CropFocus[] = FARM_CROPS.map((c) => ({
  ...c,
  sharePct: getCropSharePct(c.areaHa),
}));

/** Paleta alinhada à identidade Prevagro (branco + verde agrícola). */
export const chartColors = {
  temp: "#E4B53A",
  rain: "#2E6F1E",
  riskHeat: "#E4B53A",
  riskWater: "#4E8026",
  ndvi: "#77A83B",
  grid: "rgb(15 58 31 / 8%)",
  axis: "#4A6340",
} as const;

export const chartTooltip = {
  contentStyle: {
    background: "#FFFFFF",
    border: "1px solid #D8E5D0",
    borderRadius: 12,
    color: "#0F3A1F",
    fontSize: 12,
    boxShadow: "0 8px 24px rgb(15 58 31 / 0.1)",
  },
  cursor: { stroke: "rgb(15 58 31 / 12%)", strokeOpacity: 1 },
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Série mensal determinística (clima) alinhada à região Cerrado Mineiro. */
export const monthlyClimate = MONTHS.map((m, i) => ({
  m,
  temp: Number((FARM_METRICS.temp - 2.5 + Math.sin(i / 2) * 4 + (i > 4 && i < 9 ? 2 : 0)).toFixed(1)),
  chuva: Math.round(
    FARM_SNAPSHOT.chuvaAcumuladaMm / 12 +
      Math.cos(i / 2) * 18 +
      (i >= 9 || i <= 2 ? 12 : 0),
  ),
}));

/** NDVI mensal com pico na estação úmida. */
export const monthlyNdvi = MONTHS.map((m, i) => ({
  m,
  ndvi: Number((FARM_METRICS.ndvi - 0.12 + Math.sin((i - 2) / 2.4) * 0.18).toFixed(2)),
}));

const risk = getRiskBreakdown();
const soja = FARM_CROPS[1];

export const aiRecommendations = [
  {
    title: "Irrigação suplementar",
    desc: `Umidade do solo em ${FARM_METRICS.umidade}% — déficit de ${FARM_SNAPSHOT.deficitHidricoMm} mm na janela de ${FARM_SNAPSHOT.windowDays} dias. Priorize a área de soja (${soja.areaHa} ha).`,
    tone: "primary" as const,
  },
  {
    title: "Monitorar ferrugem (soja)",
    desc: `Pressão fitossanitária ${risk.fitossanitario.toLowerCase()} com NDVI ${soja.ndvi.toFixed(2)} em ${soja.stage.toLowerCase()}. Vistoria recomendada esta semana.`,
    tone: "warning" as const,
  },
  {
    title: "Risco de seca moderado",
    desc: `Score climático ${RISK_SCORE}/100 (${FARM_METRICS.risco.toLowerCase()}). ET₀ ${FARM_SNAPSHOT.evapotranspiracaoMm} mm vs chuva ${FARM_SNAPSHOT.chuvaAcumuladaMm} mm no período.`,
    tone: "danger" as const,
  },
];

export const strategicInsight = {
  summary: `Com base nos últimos ${FARM_SNAPSHOT.windowDays} dias, a ${FARM_NAME} apresenta risco climático ${FARM_METRICS.risco.toLowerCase()} (${RISK_SCORE}/100), umidade ${FARM_METRICS.umidade}%, NDVI ${FARM_METRICS.ndvi.toFixed(2)} e solo ${Math.round(FARM_METRICS.soloScore * 100)}/100 no perímetro de ${FARM_HECTARES} ha.`,
  action: `Priorize irrigação na soja (${soja.areaHa} ha), manejo fitossanitário (${risk.fitossanitario.toLowerCase()}) e monitoramento hídrico do café (${FARM_CROPS[0].areaHa} ha) na próxima janela operacional.`,
  tags: ["Irrigação soja", "Manejo ferrugem", "Monitorar seca", "Adubação café"],
};

export type OverviewKpiId = "risco" | "ndvi" | "umidade" | "temp" | "solo";

export type OverviewKpi = {
  id: OverviewKpiId;
  label: string;
  value: string;
  unit?: string;
  delta: number;
  tone: "primary" | "warning" | "default";
};

/** KPIs da visão geral — valores e deltas derivados do mock central. */
export const getOverviewKpis = (): OverviewKpi[] => [
  {
    id: "risco",
    label: "Risco Climático",
    value: String(RISK_SCORE),
    unit: "/100",
    delta: FARM_KPI_DELTAS.risco,
    tone: "warning",
  },
  {
    id: "ndvi",
    label: "Índice de Vegetação (NDVI)",
    value: FARM_METRICS.ndvi.toFixed(2),
    delta: FARM_KPI_DELTAS.ndvi,
    tone: "primary",
  },
  {
    id: "umidade",
    label: "Umidade do Solo",
    value: String(FARM_METRICS.umidade),
    unit: "%",
    delta: FARM_KPI_DELTAS.umidade,
    tone: "primary",
  },
  {
    id: "temp",
    label: "Temperatura Média",
    value: FARM_METRICS.temp.toFixed(1).replace(".", ","),
    unit: "°C",
    delta: FARM_KPI_DELTAS.temp,
    tone: "default",
  },
  {
    id: "solo",
    label: "Qualidade do Solo",
    value: String(Math.round(FARM_METRICS.soloScore * 100)),
    unit: "/100",
    delta: FARM_KPI_DELTAS.solo,
    tone: "default",
  },
];

export { FARM_KPI_DELTAS, FARM_SNAPSHOT, getRiskBreakdown, getWeightedNdvi };
