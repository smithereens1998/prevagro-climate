import { PERIMETER_FILL, PERIMETER_LINE } from "@/lib/geo/mapbox-shared";
import { rgbToHex, type RGB } from "@/lib/geo/map-colors";

/** Verde claro da marca — ponto de partida da animação. */
const BRAND_LIGHT_RGB: RGB = [119, 168, 59];

export type RevealFeatureOptions = {
  fillColor: string;
  fillOpacity?: number;
  lineColor?: string;
  lineOpacity?: number;
  durationMs?: number;
  delayMs?: number;
  fromRgb?: RGB;
  ambient?: boolean;
};

export type RevealPaintTarget = {
  layerId: string;
  property: string;
  target: number;
  delayMs?: number;
};

export type AmbientPaintTarget = {
  layerId: string;
  property: string;
  base: number;
  amplitude?: number;
  phaseOffset?: number;
};

export type AmbientPulseConfig = {
  feature?: {
    fillColor: string;
    lineColor?: string;
    fillOpacity: number;
    lineOpacity: number;
    opacityAmplitude?: number;
    colorAmplitude?: number;
  };
  paints?: AmbientPaintTarget[];
  periodMs?: number;
};

type MapAmbientState = {
  raf: number | null;
  running: boolean;
  startedAt: number;
  config: AmbientPulseConfig | null;
};

type MapboxPaintMap = {
  getLayer?: (id: string) => unknown;
  setPaintProperty?: (layer: string, prop: string, value: unknown) => void;
  __prevagroRevealRaf?: number | null;
  __prevagroAmbient?: MapAmbientState;
};

const hexToRgb = (hex: string): RGB => {
  const normalized = hex.replace("#", "").trim();
  if (normalized.length === 3) {
    return [
      Number.parseInt(normalized[0] + normalized[0], 16),
      Number.parseInt(normalized[1] + normalized[1], 16),
      Number.parseInt(normalized[2] + normalized[2], 16),
    ];
  }
  return [
    Number.parseInt(normalized.slice(0, 2), 16),
    Number.parseInt(normalized.slice(2, 4), 16),
    Number.parseInt(normalized.slice(4, 6), 16),
  ];
};

const mixRgb = (a: RGB, b: RGB, t: number): RGB => [
  Math.round(a[0] + (b[0] - a[0]) * t),
  Math.round(a[1] + (b[1] - a[1]) * t),
  Math.round(a[2] + (b[2] - a[2]) * t),
];

const lightenRgb = (rgb: RGB, amount: number): RGB => [
  Math.min(255, Math.round(rgb[0] + (255 - rgb[0]) * amount)),
  Math.min(255, Math.round(rgb[1] + (255 - rgb[1]) * amount)),
  Math.min(255, Math.round(rgb[2] + (255 - rgb[2]) * amount)),
];

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

const getAmbientState = (map: MapboxPaintMap): MapAmbientState => {
  if (!map.__prevagroAmbient) {
    map.__prevagroAmbient = {
      raf: null,
      running: false,
      startedAt: 0,
      config: null,
    };
  }
  return map.__prevagroAmbient;
};

export const cancelMapRevealAnimation = (map: unknown) => {
  const m = map as MapboxPaintMap;
  if (m?.__prevagroRevealRaf != null) {
    cancelAnimationFrame(m.__prevagroRevealRaf);
    m.__prevagroRevealRaf = null;
  }
};

export const cancelMapAmbientAnimation = (map: unknown) => {
  const m = map as MapboxPaintMap;
  const state = m?.__prevagroAmbient;
  if (!state) return;
  state.running = false;
  if (state.raf != null) {
    cancelAnimationFrame(state.raf);
    state.raf = null;
  }
  state.config = null;
};

export const cancelMapAnimations = (map: unknown) => {
  cancelMapRevealAnimation(map);
  cancelMapAmbientAnimation(map);
};

const runAmbientTick = (map: MapboxPaintMap, now: number) => {
  const state = getAmbientState(map);
  if (!state.running || !state.config || !map.setPaintProperty) return;

  const periodSec = (state.config.periodMs ?? 5200) / 1000;
  const elapsed = (now - state.startedAt) / 1000;
  const baseWave = Math.sin((elapsed / periodSec) * Math.PI * 2);

  const feature = state.config.feature;
  if (feature && map.getLayer?.(PERIMETER_FILL)) {
    const fillRgb = hexToRgb(feature.fillColor);
    const lineRgb = hexToRgb(feature.lineColor ?? feature.fillColor);
    const opacityAmp = feature.opacityAmplitude ?? 0.035;
    const colorAmp = feature.colorAmplitude ?? 0.07;
    const colorWave = Math.sin((elapsed / periodSec) * Math.PI * 2 + 1.4);

    const fillOpacity = Math.max(
      0.08,
      Math.min(0.72, feature.fillOpacity + opacityAmp * baseWave),
    );
    const lineOpacity = Math.max(
      0.2,
      Math.min(1, feature.lineOpacity + opacityAmp * 0.55 * baseWave),
    );
    const tint = Math.max(0, Math.min(1, 0.5 + colorWave * 0.5)) * colorAmp;
    const fillColor = rgbToHex(mixRgb(fillRgb, lightenRgb(fillRgb, 0.35), tint));
    const strokeColor = rgbToHex(mixRgb(lineRgb, lightenRgb(lineRgb, 0.25), tint * 0.8));

    map.setPaintProperty(PERIMETER_FILL, "fill-color", fillColor);
    map.setPaintProperty(PERIMETER_FILL, "fill-opacity", fillOpacity);
    map.setPaintProperty(PERIMETER_LINE, "line-color", strokeColor);
    map.setPaintProperty(PERIMETER_LINE, "line-opacity", lineOpacity);
  }

  state.config.paints?.forEach((target, index) => {
    if (!map.getLayer?.(target.layerId)) return;
    const phase = target.phaseOffset ?? index * 0.85;
    const wave = Math.sin((elapsed / periodSec) * Math.PI * 2 + phase);
    const amp = target.amplitude ?? Math.max(0.02, target.base * 0.06);
    const value = Math.max(0, Math.min(1, target.base + amp * wave));
    map.setPaintProperty(target.layerId, target.property, value);
  });
};

/** Pulso contínuo e leve nas cores/opacidades do mapa. */
export const startMapAmbientPulse = (map: unknown, config: AmbientPulseConfig) => {
  const m = map as MapboxPaintMap;
  if (!m?.setPaintProperty) return;

  cancelMapAmbientAnimation(map);

  const state = getAmbientState(m);
  state.running = true;
  state.config = config;
  state.startedAt = performance.now();

  const tick = (now: number) => {
    if (!state.running) return;
    runAmbientTick(m, now);
    state.raf = requestAnimationFrame(tick);
  };

  state.raf = requestAnimationFrame(tick);
};

export const ambientFromRevealTargets = (
  targets: RevealPaintTarget[],
  opts?: { periodMs?: number },
): AmbientPulseConfig => ({
  periodMs: opts?.periodMs,
  paints: targets.map((target, index) => ({
    layerId: target.layerId,
    property: target.property,
    base: target.target,
    amplitude: Math.max(0.025, target.target * 0.055),
    phaseOffset: index * 0.9,
  })),
});

/** Revela gradualmente a cor de risco/métrica no polígono da fazenda. */
export const revealMapboxFeatureColors = (map: unknown, opts: RevealFeatureOptions) => {
  const m = map as MapboxPaintMap;

  if (!m?.getLayer?.(PERIMETER_FILL) || !m.setPaintProperty) return;

  cancelMapRevealAnimation(map);
  cancelMapAmbientAnimation(map);

  const fillOpacity = opts.fillOpacity ?? 0.42;
  const lineOpacity = opts.lineOpacity ?? 0.95;
  const durationMs = opts.durationMs ?? 1400;
  const delayMs = opts.delayMs ?? 180;
  const fromRgb = opts.fromRgb ?? BRAND_LIGHT_RGB;
  const toRgb = hexToRgb(opts.fillColor);
  const lineRgb = hexToRgb(opts.lineColor ?? opts.fillColor);
  const enableAmbient = opts.ambient !== false;

  m.setPaintProperty(PERIMETER_FILL, "fill-opacity", 0);
  m.setPaintProperty(PERIMETER_LINE, "line-opacity", 0);
  m.setPaintProperty(PERIMETER_FILL, "fill-color", rgbToHex(fromRgb));
  m.setPaintProperty(PERIMETER_LINE, "line-color", rgbToHex(fromRgb));

  const startedAt = performance.now() + delayMs;

  const tick = (now: number) => {
    if (now < startedAt) {
      m.__prevagroRevealRaf = requestAnimationFrame(tick);
      return;
    }

    const progress = Math.min(1, (now - startedAt) / durationMs);
    const eased = easeOutCubic(progress);

    m.setPaintProperty?.(PERIMETER_FILL, "fill-color", rgbToHex(mixRgb(fromRgb, toRgb, eased)));
    m.setPaintProperty?.(PERIMETER_FILL, "fill-opacity", fillOpacity * eased);
    m.setPaintProperty?.(PERIMETER_LINE, "line-color", rgbToHex(mixRgb(fromRgb, lineRgb, eased)));
    m.setPaintProperty?.(PERIMETER_LINE, "line-opacity", lineOpacity * Math.min(1, eased * 1.15));

    if (progress < 1) {
      m.__prevagroRevealRaf = requestAnimationFrame(tick);
      return;
    }

    m.__prevagroRevealRaf = null;

    if (enableAmbient) {
      startMapAmbientPulse(m, {
        feature: {
          fillColor: opts.fillColor,
          lineColor: opts.lineColor ?? opts.fillColor,
          fillOpacity,
          lineOpacity,
        },
      });
    }
  };

  m.__prevagroRevealRaf = requestAnimationFrame(tick);
};

const animatePaintToTarget = (
  map: unknown,
  layerId: string,
  property: string,
  target: number,
  durationMs: number,
  delayMs: number,
) => {
  const m = map as MapboxPaintMap;

  if (!m?.getLayer?.(layerId) || !m.setPaintProperty) return;

  m.setPaintProperty(layerId, property, 0);

  const startedAt = performance.now() + delayMs;

  const tick = (now: number) => {
    if (now < startedAt) {
      requestAnimationFrame(tick);
      return;
    }

    const progress = Math.min(1, (now - startedAt) / durationMs);
    const eased = easeOutCubic(progress);
    m.setPaintProperty?.(layerId, property, target * eased);

    if (progress < 1) requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
};

/** Revela camadas de heatmap/extrusão com leve escalonamento. */
export const revealMapboxPaintTargets = (
  map: unknown,
  targets: RevealPaintTarget[],
  opts?: { durationMs?: number; staggerMs?: number; ambient?: boolean },
) => {
  if (targets.length === 0) return;

  cancelMapAmbientAnimation(map);

  const durationMs = opts?.durationMs ?? 1000;
  const staggerMs = opts?.staggerMs ?? 160;
  const enableAmbient = opts?.ambient !== false;

  targets.forEach((target, index) => {
    animatePaintToTarget(
      map,
      target.layerId,
      target.property,
      target.target,
      durationMs,
      (target.delayMs ?? 0) + index * staggerMs,
    );
  });

  if (!enableAmbient) return;

  const totalMs = (targets.length - 1) * staggerMs + durationMs + 120;
  window.setTimeout(() => {
    startMapAmbientPulse(map, ambientFromRevealTargets(targets));
  }, totalMs);
};

export const fitMapBoundsWithReveal = (
  map: unknown,
  bounds: [[number, number], [number, number]],
  opts?: { padding?: number; duration?: number; maxZoom?: number },
) => {
  const m = map as {
    fitBounds?: (
      b: [[number, number], [number, number]],
      o: { padding?: number; duration?: number; maxZoom?: number },
    ) => void;
  };

  m.fitBounds?.(bounds, {
    padding: opts?.padding ?? 48,
    duration: opts?.duration ?? 1200,
    maxZoom: opts?.maxZoom ?? 13,
  });
};
