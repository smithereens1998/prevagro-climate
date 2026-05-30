/**
 * Dados geoespaciais da Fazenda Daterra Coffee — Patrocínio/MG.
 * Análise por perímetro único (sem talhões). Substitua o polígono pelo CAR/SIGEF.
 */

export type Risco = "Baixo" | "Médio" | "Alto";

export type FarmMetricKey =
  | "ndvi"
  | "temp"
  | "umidade"
  | "soloScore"
  | "riscoScore"
  | "produtividade";

export type FarmMetrics = {
  ndvi: number;
  temp: number;
  umidade: number;
  soloScore: number;
  riscoScore: number;
  /** Índice 0–100 para camada de produtividade no mapa (não é sc/ha). */
  produtividade: number;
  risco: Risco;
};

export type CropStatus = "ok" | "warn" | "new" | "done";

export type FarmCrop = {
  id: "cafe" | "soja";
  name: string;
  areaHa: number;
  ndvi: number;
  produtividade: number;
  prodUnit: string;
  stage: string;
  status: CropStatus;
};

/** Variação vs. janela anterior (mock — substituir por API). */
export const FARM_KPI_DELTAS = {
  risco: -4,
  ndvi: 5,
  umidade: 3,
  produtividade: 8,
  temp: -1,
  solo: 2,
} as const;

/** Contexto operacional das últimas semanas. */
export const FARM_SNAPSHOT = {
  updatedAt: "30/05/2026",
  windowDays: 30,
  chuvaAcumuladaMm: 142,
  evapotranspiracaoMm: 118,
  deficitHidricoMm: 12,
  pressaoFungica: "Moderada" as const,
} as const;

export type PerimeterProps = {
  nome: string;
  municipio: string;
  cultura: string;
  safra: string;
  fonte: string;
  hectares: number;
};

export type PerimeterFeature = {
  type: "Feature";
  properties: PerimeterProps;
  geometry: { type: "Polygon"; coordinates: [number, number][][] };
};

/** Centro da Fazenda Daterra Coffee (lon, lat) — Patrocínio/MG. */
export const FARM_CENTER: [number, number] = [-47.0167, -18.6833];

/** Indicadores agregados da área (mock — substituir por API/modelo). */
export const FARM_METRICS: FarmMetrics = {
  ndvi: 0.64,
  temp: 28.9,
  umidade: 61,
  soloScore: 0.72,
  riscoScore: 0.46,
  produtividade: 79,
  risco: "Médio",
};

/** Culturas ativas na safra — áreas somam o perímetro. */
export const FARM_CROPS: FarmCrop[] = [
  {
    id: "cafe",
    name: "Café",
    areaHa: 520,
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
    ndvi: 0.58,
    produtividade: 68,
    prodUnit: "sc/ha",
    stage: "Enchimento",
    status: "warn",
  },
];

export const getRiskScore = () => Math.round(FARM_METRICS.riscoScore * 100);

export const getCropSharePct = (areaHa: number) =>
  Math.round((areaHa / FARM_PERIMETER.properties.hectares) * 100);

/** Produtividade média ponderada (sc/ha) café + soja. */
export const getWeightedProductivity = () =>
  Number(
    (
      FARM_CROPS.reduce((acc, c) => acc + c.produtividade * c.areaHa, 0) /
      FARM_PERIMETER.properties.hectares
    ).toFixed(1),
  );

export const getRiskBreakdown = () => ({
  hidrico:
    FARM_METRICS.umidade < 55 ? ("Alto" as const) : FARM_METRICS.umidade < 70 ? ("Médio" as const) : ("Baixo" as const),
  termico:
    FARM_METRICS.temp > 32 ? ("Alto" as const) : FARM_METRICS.temp > 28 ? ("Médio" as const) : ("Baixo" as const),
  fitossanitario: FARM_SNAPSHOT.pressaoFungica,
});

/** Polígono elíptico placeholder (~782 ha) centrado na fazenda. */
function buildPerimeter(): PerimeterFeature {
  const [cx, cy] = FARM_CENTER;
  const rx = 0.042;
  const ry = 0.032;
  const steps = 16;
  const ring: [number, number][] = [];

  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ring.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  ring.push(ring[0]);

  return {
    type: "Feature",
    properties: {
      nome: "Fazenda Daterra Coffee",
      municipio: "Patrocínio/MG",
      cultura: "Café · Soja",
      safra: "24/25",
      fonte: "placeholder (substituir por CAR/SICAR ou SIGEF)",
      hectares: 782,
    },
    geometry: { type: "Polygon", coordinates: [ring] },
  };
}

export const FARM_PERIMETER: PerimeterFeature = buildPerimeter();

export const farmBounds = (): [[number, number], [number, number]] => {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const [lon, lat] of FARM_PERIMETER.geometry.coordinates[0]) {
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }
  return [
    [minLon, minLat],
    [maxLon, maxLat],
  ];
};

export const perimeterCentroid = (): [number, number] => {
  const ring = FARM_PERIMETER.geometry.coordinates[0].slice(0, -1);
  const sum = ring.reduce<[number, number]>(
    (acc, [lon, lat]) => [acc[0] + lon, acc[1] + lat],
    [0, 0],
  );
  return [sum[0] / ring.length, sum[1] / ring.length];
};

export const pointInPerimeter = (pt: [number, number]) => {
  const ring = FARM_PERIMETER.geometry.coordinates[0];
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const hit =
      yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi;
    if (hit) inside = !inside;
  }
  return inside;
};

export type HeatPoint = { position: [number, number]; weight: number };

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const metricWeight = (metric: FarmMetricKey, value: number) => {
  if (metric === "temp") return (value - 24) / 12;
  if (metric === "umidade") return value / 100;
  if (metric === "produtividade") return (value - 55) / 45;
  return value;
};

/** Pontos de calor amostrados dentro do perímetro da fazenda. */
export function makeHeatPoints(metric: FarmMetricKey, count = 180): HeatPoint[] {
  const rand = mulberry32(metric.length * 9973 + 17);
  const [[minLon, minLat], [maxLon, maxLat]] = farmBounds();
  const base = metricWeight(metric, FARM_METRICS[metric]);
  const out: HeatPoint[] = [];

  let guard = 0;
  while (out.length < count && guard < count * 40) {
    guard++;
    const lon = minLon + rand() * (maxLon - minLon);
    const lat = minLat + rand() * (maxLat - minLat);
    if (!pointInPerimeter([lon, lat])) continue;
    out.push({
      position: [lon, lat],
      weight: Math.max(0.05, Math.min(1, base * (0.65 + rand() * 0.7))),
    });
  }
  return out;
}

/** Pontos GeoJSON para heatmap nativo Mapbox (drapa no terreno 3D). */
export function makeHeatGeoJSON(metric: FarmMetricKey) {
  return {
    type: "FeatureCollection" as const,
    features: makeHeatPoints(metric).map((p) => ({
      type: "Feature" as const,
      properties: { weight: p.weight },
      geometry: { type: "Point" as const, coordinates: p.position },
    })),
  };
}
