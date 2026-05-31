import { describe, it, expect } from "vitest";
import { buildLayerMetricLabels } from "./layer-metrics";

describe("buildLayerMetricLabels", () => {
  it("formata valores da API por camada", () => {
    const labels = buildLayerMetricLabels({
      weather: { main: { temp_celsius: 28.4, humidity: 62 } },
      soil: { moisture: 0.41 },
      satellite: [{ stats: { ndvi: 0.71 } }],
      riskScore: 46,
    });

    expect(labels.Temperatura).toMatchObject({ value: "28.4 °C", fromApi: true });
    expect(labels.Umidade).toMatchObject({ value: "62 %", fromApi: true });
    expect(labels.Solo).toMatchObject({ value: "41 %", fromApi: true });
    expect(labels.Vegetação).toMatchObject({ value: "0.71", fromApi: true });
    expect(labels["Risco Climático"].value).toContain("46/100");
  });

  it("indica ausência de dado satelital", () => {
    const labels = buildLayerMetricLabels({});
    expect(labels.Vegetação).toMatchObject({ value: "—", fromApi: false });
  });
});
