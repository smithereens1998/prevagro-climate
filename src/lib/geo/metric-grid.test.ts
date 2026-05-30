import { describe, expect, it } from "vitest";
import { makeHeatGeoJSON } from "./farm-data";

describe("makeHeatGeoJSON", () => {
  it("converte pontos de calor em FeatureCollection", () => {
    const geo = makeHeatGeoJSON("ndvi");
    expect(geo.type).toBe("FeatureCollection");
    expect(geo.features.length).toBeGreaterThan(0);
    expect(geo.features[0].geometry.type).toBe("Point");
    expect(geo.features[0].properties.weight).toBeGreaterThan(0);
  });
});
