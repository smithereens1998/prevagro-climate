import type { FarmMetricKey } from "./farm-data";

export type RGB = [number, number, number];
export type ColorRange = [RGB, RGB, RGB, RGB, RGB, RGB];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const mix = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t)),
];

export const TEMP_RANGE: ColorRange = [
  [255, 255, 178],
  [254, 217, 118],
  [254, 178, 76],
  [253, 141, 60],
  [240, 59, 32],
  [189, 0, 38],
];

export const UMID_RANGE: ColorRange = [
  [237, 248, 251],
  [179, 205, 227],
  [140, 150, 198],
  [136, 86, 167],
  [62, 174, 217],
  [33, 102, 172],
];

export const RISK_RANGE: ColorRange = [
  [26, 152, 80],
  [145, 207, 96],
  [217, 239, 139],
  [254, 224, 139],
  [252, 141, 89],
  [215, 48, 39],
];

export const ndviColor = (ndvi: number): RGB => {
  const t = Math.max(0, Math.min(1, (ndvi - 0.3) / 0.55));
  return t < 0.5
    ? mix([180, 83, 9], [234, 179, 8], t / 0.5)
    : mix([234, 179, 8], [34, 197, 94], (t - 0.5) / 0.5);
};

export const soloColor = (score: number): RGB =>
  mix([92, 64, 38], [186, 134, 86], Math.max(0, Math.min(1, score)));

export const prodColor = (scHa: number): RGB =>
  mix([132, 204, 120], [22, 163, 74], Math.max(0, Math.min(1, (scHa - 55) / 45)));

/** Normaliza temperatura (°C) para escala 0..1 usada no heatmap. */
export const tempNorm = (temp: number) => Math.max(0, Math.min(1, (temp - 24) / 12));

export const tempColor = (temp: number): RGB => {
  const t = tempNorm(temp);
  const idx = Math.min(5, Math.floor(t * 5));
  return TEMP_RANGE[idx];
};

export const umidColor = (pct: number): RGB => {
  const t = Math.max(0, Math.min(1, pct / 100));
  const idx = Math.min(5, Math.floor(t * 5));
  return UMID_RANGE[idx];
};

export const riscoColor = (score: number): RGB => {
  const t = Math.max(0, Math.min(1, score));
  const idx = Math.min(5, Math.floor(t * 5));
  return RISK_RANGE[idx];
};

export const toRgba = (rgb: RGB, alpha: number): [number, number, number, number] => [
  rgb[0],
  rgb[1],
  rgb[2],
  Math.round(Math.max(0, Math.min(1, alpha)) * 255),
];

export const rgbToHex = ([r, g, b]: RGB) =>
  `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;

export const rgbToCss = ([r, g, b]: RGB) => `rgb(${r}, ${g}, ${b})`;

/** Expressão Mapbox `heatmap-color` a partir de uma escala de 6 cores. */
export const heatmapColorExpression = (range: ColorRange) => {
  const densityStops = [0.08, 0.22, 0.4, 0.58, 0.78, 1];
  const expr: unknown[] = ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)"];
  range.forEach((rgb, i) => {
    expr.push(densityStops[i], rgbToCss(rgb));
  });
  return expr;
};

export const NDVI_HEAT_RANGE: ColorRange = [
  [180, 83, 9],
  [234, 179, 8],
  [250, 204, 21],
  [134, 239, 172],
  [34, 197, 94],
  [21, 128, 61],
];

export const SOLO_HEAT_RANGE: ColorRange = [
  [92, 64, 38],
  [120, 82, 52],
  [139, 105, 70],
  [160, 120, 80],
  [173, 127, 88],
  [186, 134, 86],
];

/** Cor normalizada 0..1 para cada métrica da fazenda. */
export const colorForMetricNorm = (metric: FarmMetricKey, t: number): RGB => {
  const v = Math.max(0, Math.min(1, t));
  switch (metric) {
    case "ndvi":
      return ndviColor(0.3 + v * 0.55);
    case "temp":
      return tempColor(24 + v * 12);
    case "umidade":
      return umidColor(v * 100);
    case "soloScore":
      return soloColor(v);
    case "riscoScore":
      return riscoColor(v);
    case "produtividade":
      return prodColor(55 + v * 45);
  }
};
