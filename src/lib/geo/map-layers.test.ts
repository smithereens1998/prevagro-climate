import { describe, it, expect } from "vitest";
import {
  BASEMAP_STYLES,
  getLegendsForLayers,
  LAYER_IDS,
  resolveVizKind,
} from "./map-layers";

describe("map-layers", () => {
  it("expõe todas as camadas da UI", () => {
    expect(LAYER_IDS).toHaveLength(5);
  });

  it("resolve modo automático conforme default de cada camada", () => {
    expect(resolveVizKind("Vegetação", "auto")).toBe("geometry");
    expect(resolveVizKind("Temperatura", "auto")).toBe("heatmap");
    expect(resolveVizKind("Solo", "auto")).toBe("geometry");
  });

  it("força heatmap em todas as camadas no modo calor", () => {
    for (const id of LAYER_IDS) {
      expect(resolveVizKind(id, "heatmap")).toBe("heatmap");
    }
  });

  it("monta legendas apenas das camadas ativas", () => {
    const legends = getLegendsForLayers(["Temperatura", "Risco Climático", "foo"]);
    expect(legends).toHaveLength(2);
    expect(legends[0].title).toContain("Temperatura");
  });

  it("mapeia basemaps Mapbox", () => {
    expect(BASEMAP_STYLES.satellite).toContain("satellite-v9");
    expect(BASEMAP_STYLES.terrain).toContain("outdoors");
  });
});
