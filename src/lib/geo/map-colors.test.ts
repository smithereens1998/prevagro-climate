import { describe, it, expect } from "vitest";
import { ndviColor, tempNorm, toRgba, heatmapColorExpression, RISK_RANGE } from "./map-colors";

describe("map-colors", () => {
  it("normaliza temperatura entre 0 e 1", () => {
    expect(tempNorm(24)).toBe(0);
    expect(tempNorm(36)).toBe(1);
    expect(tempNorm(30)).toBeCloseTo(0.5);
  });

  it("ndviColor retorna RGB válido", () => {
    const c = ndviColor(0.68);
    expect(c.every((v) => v >= 0 && v <= 255)).toBe(true);
  });

  it("toRgba inclui alpha", () => {
    expect(toRgba([10, 20, 30], 1)).toEqual([10, 20, 30, 255]);
    expect(toRgba([10, 20, 30], 0)[3]).toBe(0);
  });

  it("heatmapColorExpression usa stops estritamente crescentes", () => {
    const expr = heatmapColorExpression(RISK_RANGE) as unknown[];
    const stops: number[] = [];
    for (let i = 3; i < expr.length; i += 2) {
      if (typeof expr[i] === "number") stops.push(expr[i] as number);
    }
    for (let i = 1; i < stops.length; i++) {
      expect(stops[i]).toBeGreaterThan(stops[i - 1]);
    }
  });
});
