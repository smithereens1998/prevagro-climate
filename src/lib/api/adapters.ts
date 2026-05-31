import type { AgroWeatherResponse, HorizonFeaturesSnapshot, LlmPrediction } from "./types";
import {
  aiRecommendations as mockRecommendations,
  strategicInsight as mockInsight,
  type OverviewKpi,
  getOverviewKpis,
} from "@/lib/farm-insights";

export type UiRecommendation = {
  title: string;
  desc: string;
  tone: "primary" | "warning" | "danger";
};

export type UiStrategicInsight = {
  summary: string;
  action: string;
  tags: string[];
};

const priorityToTone = (prioridade: string): UiRecommendation["tone"] => {
  const p = prioridade.toLowerCase();
  if (p === "alta") return "danger";
  if (p === "media" || p === "média") return "warning";
  return "primary";
};

export const horizonToRiskScore = (
  snapshot: HorizonFeaturesSnapshot | undefined,
): number | null => {
  if (!snapshot?.features) return null;
  const f30 = snapshot.features["30d"];
  const f6 = snapshot.features["6m"];
  const f12 = snapshot.features["12m"];
  const heat = f30?.heat_risk_score ?? f6?.heat_risk_score ?? f12?.heat_risk_score;
  const water = f30?.water_stress_score ?? f6?.water_stress_score ?? f12?.water_stress_score;
  if (heat == null && water == null) return null;
  const h = heat ?? 0;
  const w = water ?? 0;
  return Math.round(((h + w) / 2) * 100);
};

export const mergeOverviewKpis = (
  base: OverviewKpi[],
  riskScore: number | null,
  weather: AgroWeatherResponse | undefined,
): OverviewKpi[] => {
  if (riskScore == null && !weather?.main) return base;

  return base.map((kpi) => {
    if (kpi.id === "risco" && riskScore != null) {
      return { ...kpi, value: String(riskScore) };
    }
    if (kpi.id === "temp" && weather?.main?.temp_celsius != null) {
      return {
        ...kpi,
        value: weather.main.temp_celsius.toFixed(1).replace(".", ","),
      };
    }
    if (kpi.id === "umidade" && weather?.main?.humidity != null) {
      return { ...kpi, value: String(Math.round(weather.main.humidity)) };
    }
    return kpi;
  });
};

export const llmToStrategicInsight = (
  prediction: LlmPrediction | undefined,
): UiStrategicInsight => {
  if (!prediction?.diagnostico?.resumo) return mockInsight;

  const tags = [
    ...(prediction.alertas ?? []).slice(0, 2),
    prediction.diagnostico.nivel_risco ? `Risco ${prediction.diagnostico.nivel_risco}` : "",
  ].filter(Boolean);

  const firstAction = prediction.acoes_recomendadas?.[0];
  return {
    summary: prediction.diagnostico.resumo,
    action: firstAction
      ? `${firstAction.acao} — ${firstAction.objetivo} (${firstAction.prazo})`
      : mockInsight.action,
    tags: tags.length > 0 ? tags : mockInsight.tags,
  };
};

export const llmToRecommendations = (prediction: LlmPrediction | undefined): UiRecommendation[] => {
  const fromApi = prediction?.acoes_recomendadas?.map((a) => ({
    title: a.acao,
    desc: `${a.objetivo} · Prazo: ${a.prazo}`,
    tone: priorityToTone(a.prioridade),
  }));

  if (fromApi && fromApi.length > 0) return fromApi;
  return mockRecommendations;
};

export const getDefaultOverviewKpis = () => getOverviewKpis();
