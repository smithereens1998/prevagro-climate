export type HealthStatus = { status: string };

export type FarmCoordinate = {
  id: number;
  user_id: number;
  name: string;
  latitude: number;
  longitude: number;
  polygon_id?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type FarmLatestIdentity = {
  farm_name: string;
  farm_location: string | null;
  latitude: number | null;
  longitude: number | null;
  observed_at: string;
};

export type FarmMonitoringObservation = {
  farm_name: string;
  farm_location: string | null;
  latitude: number;
  longitude: number;
  observed_at: string;
  weather: {
    temp_celsius: number | null;
    temp_min_celsius: number | null;
    temp_max_celsius: number | null;
    humidity_percent: number | null;
    wind_speed_mps: number | null;
  };
  soil: {
    moisture: number | null;
    temp_surface_celsius: number | null;
  };
};

export type CoordinatePayload = {
  name: string;
  latitude: number;
  longitude: number;
};

export type HorizonFeaturePoint = {
  reference_date: string;
  projected_avg_temp_c: number | null;
  projected_total_precip_mm: number | null;
  projected_dry_days_ratio: number | null;
  baseline_avg_soil_moisture: number | null;
  baseline_avg_temp_c: number | null;
  heat_risk_score: number | null;
  water_stress_score: number | null;
  feature_payload?: unknown;
};

export type HorizonFeaturesSnapshot = {
  user_id: number;
  latitude: number;
  longitude: number;
  features: Record<string, HorizonFeaturePoint>;
};

export type HorizonHistoryPoint = {
  reference_date: string;
  horizon_days?: number;
  horizon_months: number;
  projected_avg_temp_c: number | null;
  projected_total_precip_mm: number | null;
  projected_dry_days_ratio: number | null;
  baseline_avg_soil_moisture: number | null;
  baseline_avg_temp_c: number | null;
  heat_risk_score: number | null;
  water_stress_score: number | null;
};

export type HorizonFeaturesHistory = {
  user_id: number;
  latitude: number;
  longitude: number;
  history: HorizonHistoryPoint[];
};

export type SeasonalForecastDay = {
  forecast_date: string;
  temp_mean_c: number | null;
  temp_max_c: number | null;
  temp_min_c: number | null;
  precipitation_mm: number | null;
  dry_day_flag: boolean;
};

export type SeasonalForecastDaily = {
  user_id: number;
  latitude: number;
  longitude: number;
  days: number;
  source_name: string;
  model_name: string;
  summary: {
    avg_temp_c: number | null;
    total_precip_mm: number | null;
    dry_days: number;
    samples: number;
  };
  forecast: SeasonalForecastDay[];
};

export type DailyFullStep = {
  status: string;
  attempts_used?: number;
  duration_ms?: number;
  run_id?: number;
  saved_forecast_rows?: number;
  prediction_id?: number;
  error?: string;
};

export type DailyFullLatest = {
  id?: number;
  run_date?: string;
  status?: string;
  steps?: Record<string, DailyFullStep>;
  duration_ms?: number;
  started_at?: string;
  finished_at?: string;
};

export type LlmDiagnostico = {
  nivel_risco: string;
  resumo: string;
};

export type LlmAcao = {
  prioridade: string;
  acao: string;
  objetivo: string;
  prazo: string;
};

export type LlmPrediction = {
  diagnostico: LlmDiagnostico;
  predicoes: Array<{ horizonte: string; insight: string; confianca: number }>;
  acoes_recomendadas: LlmAcao[];
  alertas: string[];
  metricas_chave: Record<string, string>;
  metadata?: {
    rows_analyzed?: number;
    prediction_id?: number;
    prompt_version?: string;
    model_name?: string;
  };
};

export type AgroWeatherMain = {
  temp_celsius?: number;
  feels_like_celsius?: number;
  temp_min_celsius?: number;
  temp_max_celsius?: number;
  humidity?: number;
  pressure?: number;
};

export type AgroWeatherResponse = {
  main?: AgroWeatherMain;
  weather?: Array<{ main: string; description: string }>;
  wind?: { speed?: number };
  clouds?: { all?: number };
};

export type AgroSoilResponse = {
  moisture?: number;
  t0?: number;
  t10?: number;
  temperature_celsius?: { t0_celsius?: number; t10_celsius?: number };
};

export type SatelliteHistoryItem = {
  dt?: number;
  date?: string;
  stats?: Record<string, number | string | null>;
  image?: { ndvi?: number; evi?: number };
  data?: Record<string, unknown>;
};

export type CoordinateQuery = {
  latitude?: number;
  longitude?: number;
};

export type SoilAnalysisUpdateResponse = {
  status: string;
  analysis: string;
  latitude: number;
  longitude: number;
};
