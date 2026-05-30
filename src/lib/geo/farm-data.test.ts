import { describe, it, expect } from "vitest";
import {
  FARM_CENTER,
  FARM_METRICS,
  FARM_PERIMETER,
  farmBounds,
  makeHeatPoints,
  pointInPerimeter,
} from "./farm-data";

const BRAZIL_BOUNDS = { minLon: -74, maxLon: -34, minLat: -34, maxLat: 6 };
const PATROCINIO_CIDADE: [number, number] = [-46.972151, -18.755487];

const inBrazil = ([lon, lat]: [number, number]) =>
  lon >= BRAZIL_BOUNDS.minLon &&
  lon <= BRAZIL_BOUNDS.maxLon &&
  lat >= BRAZIL_BOUNDS.minLat &&
  lat <= BRAZIL_BOUNDS.maxLat;

const distanceKm = (a: [number, number], b: [number, number]) => {
  const meanLat = ((a[1] + b[1]) / 2) * (Math.PI / 180);
  const dLon = (b[0] - a[0]) * Math.cos(meanLat);
  const dLat = b[1] - a[1];
  return Math.sqrt(dLon * dLon + dLat * dLat) * 111;
};

describe("FARM_CENTER", () => {
  it("aponta para a Fazenda Daterra (Patrocínio/MG) no formato [lon, lat]", () => {
    expect(FARM_CENTER).toEqual([-47.0167, -18.6833]);
  });

  it("está dentro do Brasil e longe do centro urbano", () => {
    expect(inBrazil(FARM_CENTER)).toBe(true);
    const d = distanceKm(FARM_CENTER, PATROCINIO_CIDADE);
    expect(d).toBeGreaterThan(3);
    expect(d).toBeLessThan(30);
  });
});

describe("FARM_PERIMETER", () => {
  it("é um único polígono fechado contendo o centro da fazenda", () => {
    const ring = FARM_PERIMETER.geometry.coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(pointInPerimeter(FARM_CENTER)).toBe(true);
  });

  it("expõe metadados da fazenda", () => {
    expect(FARM_PERIMETER.properties.nome).toContain("Daterra");
    expect(FARM_PERIMETER.properties.hectares).toBeGreaterThan(0);
  });
});

describe("FARM_METRICS", () => {
  it("tem indicadores agregados válidos", () => {
    expect(FARM_METRICS.ndvi).toBeGreaterThan(0);
    expect(FARM_METRICS.ndvi).toBeLessThanOrEqual(1);
    expect(["Baixo", "Médio", "Alto"]).toContain(FARM_METRICS.risco);
  });
});

describe("mock derivado", () => {
  it("FARM_CROPS soma a área do perímetro", async () => {
    const { FARM_CROPS } = await import("./farm-data");
    const total = FARM_CROPS.reduce((acc, c) => acc + c.areaHa, 0);
    expect(total).toBe(FARM_PERIMETER.properties.hectares);
  });

  it("getWeightedProductivity reflete café e soja", async () => {
    const { getWeightedProductivity } = await import("./farm-data");
    expect(getWeightedProductivity()).toBeGreaterThan(40);
    expect(getWeightedProductivity()).toBeLessThan(75);
  });
});

describe("farmBounds", () => {
  it("engloba todos os vértices do perímetro", () => {
    const [[minLon, minLat], [maxLon, maxLat]] = farmBounds();
    for (const [lon, lat] of FARM_PERIMETER.geometry.coordinates[0]) {
      expect(lon).toBeGreaterThanOrEqual(minLon);
      expect(lon).toBeLessThanOrEqual(maxLon);
      expect(lat).toBeGreaterThanOrEqual(minLat);
      expect(lat).toBeLessThanOrEqual(maxLat);
    }
  });
});

describe("makeHeatPoints", () => {
  it("é determinístico e gera pontos dentro do perímetro", () => {
    const pts = makeHeatPoints("temp");
    expect(pts).toEqual(makeHeatPoints("temp"));
    expect(pts.length).toBeGreaterThan(0);
    for (const p of pts) {
      expect(pointInPerimeter(p.position)).toBe(true);
      expect(p.weight).toBeGreaterThanOrEqual(0);
      expect(p.weight).toBeLessThanOrEqual(1);
    }
  });
});
