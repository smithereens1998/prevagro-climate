export type MetricHint = {
  title: string;
  description: string;
  source: string;
  interpretation: string;
};

export const METRIC_HINTS = {
  forecastTemp: {
    title: "Temperatura média (30 dias)",
    description: "Média diária projetada para os próximos 30 dias no ponto da fazenda.",
    source: "GET /pipeline/seasonal-forecast/daily · Open-Meteo Climate",
    interpretation: "Acima de 32 °C aumenta risco térmico. Entre 24–28 °C tende a ser confortável para a maioria das culturas.",
  },
  forecastRain: {
    title: "Chuva acumulada (30 dias)",
    description: "Soma da precipitação prevista no período.",
    source: "GET /pipeline/seasonal-forecast/daily · Open-Meteo Climate",
    interpretation: "Valores muito baixos (< 30 mm em 30 dias) indicam possível déficit hídrico. Depende da cultura e do solo.",
  },
  forecastDryDays: {
    title: "Dias secos",
    description: "Dias com chuva prevista inferior a 1 mm.",
    source: "GET /pipeline/seasonal-forecast/daily · Open-Meteo Climate",
    interpretation: "Muitos dias secos consecutivos elevam o estresse hídrico — quanto menor, melhor.",
  },
  riskScore: {
    title: "Risco climático",
    description: "Score agregado de calor e estresse hídrico (média dos horizontes 6m/12m do pipeline).",
    source: "GET /pipeline/horizon-features",
    interpretation: "0–33 favorável · 34–66 atenção · 67–100 crítico. Quanto menor, melhor.",
  },
  ndviStress: {
    title: "Estresse hídrico (12m)",
    description: "Projeção de estresse hídrico para 12 meses — não é NDVI satelital.",
    source: "GET /pipeline/horizon-features · features 12m",
    interpretation: "Quanto menor, melhor. Acima de 66 indica cenário seco prolongado.",
  },
  humidity: {
    title: "Umidade relativa do ar",
    description: "Umidade do ar no momento, no centro da fazenda.",
    source: "GET /agromonitoring/weather",
    interpretation: "Muito baixa (< 30%) aumenta evapotranspiração. Valores moderados (50–70%) costumam ser mais equilibrados.",
  },
  soilMoisture: {
    title: "Umidade do solo",
    description: "Umidade superficial do solo (AgroMonitoring).",
    source: "GET /agromonitoring/soil",
    interpretation: "Quanto maior, mais água disponível na camada superficial. Interpretação depende da cultura.",
  },
  chartClimate: {
    title: "Projeção climática",
    description: "Série diária de temperatura média e chuva previstas para os próximos 30 dias.",
    source: "GET /pipeline/seasonal-forecast/daily",
    interpretation: "Use para antecipar ondas de calor ou períodos secos na janela operacional imediata.",
  },
  chartRisk: {
    title: "Evolução de risco",
    description: "Estimativa diária de risco de calor e estresse hídrico derivada da previsão de 30 dias.",
    source: "Calculado no frontend a partir de /seasonal-forecast/daily",
    interpretation: "Picos altos indicam dias críticos. Quanto menor a linha, melhor.",
  },
  chartNdvi: {
    title: "NDVI satelital",
    description: "Índice de vigor da vegetação no polígono AgroMonitoring.",
    source: "GET /agromonitoring/satellite/history",
    interpretation: "Próximo de 0,6–0,8 costuma indicar boa biomassa. Quedas bruscas podem sinalizar estresse.",
  },
  currentWeather: {
    title: "Condições atuais",
    description: "Leitura em tempo (quase) real de clima e solo no ponto da fazenda.",
    source: "GET /agromonitoring/weather e /soil",
    interpretation: "Complementa a previsão de 30 dias com o estado presente do campo.",
  },
} as const satisfies Record<string, MetricHint>;

export const riskBandLabel = (score: number | null | undefined) => {
  if (score == null || Number.isNaN(score)) return null;
  if (score <= 33) return { text: "Favorável", tone: "primary" as const };
  if (score <= 66) return { text: "Atenção", tone: "warning" as const };
  return { text: "Crítico", tone: "destructive" as const };
};
