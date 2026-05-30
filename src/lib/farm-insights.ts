import { FARM_METRICS, FARM_PERIMETER } from "@/lib/geo/farm-data";

export const FARM_NAME = FARM_PERIMETER.properties.nome;
export const FARM_MUNICIPIO = FARM_PERIMETER.properties.municipio;
export const FARM_HECTARES = FARM_PERIMETER.properties.hectares;
export const FARM_SAFRA = FARM_PERIMETER.properties.safra;
export const RISK_SCORE = Math.round(FARM_METRICS.riscoScore * 100);

export type CropFocus = {
  id: "cafe" | "soja";
  name: string;
  areaHa: number;
  sharePct: number;
  ndvi: number;
  produtividade: number;
  prodUnit: string;
  stage: string;
  status: "ok" | "warn" | "new" | "done";
};

/** Culturas em foco: café (principal) + soja (rotação). */
export const CROP_FOCUS: CropFocus[] = [
  {
    id: "cafe",
    name: "Café",
    areaHa: 520,
    sharePct: 67,
    ndvi: 0.68,
    produtividade: 42,
    prodUnit: "sc/ha",
    stage: "Grãos formados",
    status: "ok",
  },
  {
    id: "soja",
    name: "Soja",
    areaHa: 262,
    sharePct: 33,
    ndvi: 0.58,
    produtividade: 68,
    prodUnit: "sc/ha",
    stage: "Enchimento",
    status: "warn",
  },
];

export const chartTooltip = {
  contentStyle: {
    background: "oklch(0.244 0.026 240)",
    border: "1px solid oklch(1 0 0 / 0.08)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 12,
  },
  cursor: { stroke: "#6BE234", strokeOpacity: 0.3 },
};

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

/** Série mensal determinística (clima) alinhada à região Cerrado Mineiro. */
export const monthlyClimate = MONTHS.map((m, i) => ({
  m,
  temp: Number((26 + Math.sin(i / 2) * 4 + (i > 4 && i < 9 ? 2 : 0)).toFixed(1)),
  chuva: Math.round(40 + Math.cos(i / 2) * 55 + (i >= 9 || i <= 2 ? 30 : 0)),
}));

/** NDVI mensal com pico na estação úmida. */
export const monthlyNdvi = MONTHS.map((m, i) => ({
  m,
  ndvi: Number((FARM_METRICS.ndvi - 0.12 + Math.sin((i - 2) / 2.4) * 0.18).toFixed(2)),
}));

/** Produtividade por cultura (últimas safras). */
export const cropProductivityTrend = [
  { s: "21/22", cafe: 38, soja: 58 },
  { s: "22/23", cafe: 40, soja: 62 },
  { s: "23/24", cafe: 41, soja: 65 },
  { s: "24/25", cafe: 42, soja: 68 },
];

export const suitabilityCrops = [
  { name: "Café", score: 96 },
  { name: "Soja", score: 88 },
];

export const aiRecommendations = [
  {
    title: "Irrigação suplementar",
    desc: `Umidade do solo em ${FARM_METRICS.umidade}% — déficit leve previsto na área de soja nos próximos 10 dias.`,
    tone: "primary" as const,
  },
  {
    title: "Monitorar ferrugem (soja)",
    desc: "Condições de umidade favorecem pressão fúngica na parcela de soja. Vistoria recomendada esta semana.",
    tone: "warning" as const,
  },
  {
    title: "Risco de seca moderado",
    desc: `Score climático ${RISK_SCORE}/100. Janela seca de 12–14 dias pode impactar enchimento de grãos do café.`,
    tone: "danger" as const,
  },
];

export const strategicInsight = {
  summary: `Com base nos últimos 30 dias, a ${FARM_NAME} apresenta risco climático moderado (${RISK_SCORE}/100), com umidade do solo em ${FARM_METRICS.umidade}% e NDVI médio de ${FARM_METRICS.ndvi.toFixed(2)} no perímetro de ${FARM_HECTARES} ha.`,
  action: `Priorize irrigação na área de soja (${CROP_FOCUS[1].areaHa} ha), manejo fitossanitário na soja e monitoramento hídrico do café. Projeção: +6 a +9 sc/ha com intervenções nas duas culturas.`,
  tags: ["Irrigação soja", "Manejo ferrugem", "Monitorar seca", "Adubação café"],
};
