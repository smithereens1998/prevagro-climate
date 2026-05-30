# Documentacao Tecnica de Integracao Frontend

## Objetivo

Este guia documenta 100% das APIs backend disponiveis para integracao do frontend, incluindo:

- monitoramento agro (clima/solo/satelite/poligonos);
- persistencia de coordenadas e analises;
- pipelines de ingestao e previsao sazonal;
- features preditivas de 6 e 12 meses;
- analise com LLM e historico de previsoes.

## Base da API

- Base URL local (desenvolvimento): `http://127.0.0.1:8000`
- Documentacao Swagger: `GET /docs`
- Documentacao ReDoc: `GET /redoc`

## Convencoes gerais

- Formato: JSON
- Autenticacao: atualmente nao obrigatoria por token (backend usa usuario padrao interno)
- Erros FastAPI: formato padrao

Exemplo de erro:

```json
{
  "detail": "Coordinate not found"
}
```

## Healthchecks

### `GET /health`

- Uso: teste de vida da API.

Resposta:

```json
{ "status": "ok" }
```

### `GET /health/db`

- Uso: valida conexao com banco.
- Possivel erro: `503` quando banco indisponivel.

---

## 1) AgroMonitoring (dados brutos externos)

Prefixo: `/agromonitoring`

### `GET /agromonitoring/polygons`

- Lista poligonos da conta.

Campos importantes:

- `id`
- `name`
- `center` no formato `[lng, lat]`
- `area`
- `geo_json.geometry.coordinates` no formato `[lng, lat]`

### `GET /agromonitoring/polygons/{polygon_id}`

- Detalhe de um poligono especifico.

### `GET /agromonitoring/weather?lat={lat}&lon={lon}`

- Clima atual.
- Backend enriquece com Celsius em `main`:
  - `temp_celsius`
  - `feels_like_celsius`
  - `temp_min_celsius`
  - `temp_max_celsius`

### `GET /agromonitoring/soil?lat={lat}&lon={lon}`

- Solo atual.
- Backend adiciona:
  - `temperature_celsius.t0_celsius`
  - `temperature_celsius.t10_celsius`

### `GET /agromonitoring/satellite/history?polygonId={id}&start={unix}&end={unix}`

- Historico de cenas/imagens satelitais do poligono.

### `GET /agromonitoring/vegetation/indices?polygonId={id}&start={unix}&end={unix}`

- Atualmente usa mesma fonte de historico satelital (metadados e links de estatisticas/indices).

---

## 2) Monitoramento persistido (banco interno)

Prefixo: `/farm-monitoring`

### Atualizacao de analises por coordenada

#### `PUT /farm-monitoring/weather?latitude={lat}&longitude={lon}`

- Busca weather externo e faz upsert em `farm_monitoring_records`.

#### `PUT /farm-monitoring/soil?latitude={lat}&longitude={lon}`

- Busca soil externo e faz upsert em `farm_monitoring_records`.

#### `PUT /farm-monitoring/polygon?polygonId={id}&latitude={lat}&longitude={lon}`

- Busca shape do poligono e persiste `polygon_geojson` + metadados.

#### `PUT /farm-monitoring/satellite/history?...`

Query:

- `polygonId`
- `start` (unix)
- `end` (unix)
- `latitude`
- `longitude`

Persistencia:

- `satellite_source`
- `vegetation_stats`
- `payload`
- dados de poligono associados

#### `PUT /farm-monitoring/vegetation/indices?...`

Mesma estrutura do endpoint de historico, com `analysis_kind` diferente.

### CRUD de coordenadas

#### `GET /farm-monitoring/coordinates`

- Lista coordenadas persistidas.

#### `POST /farm-monitoring/coordinates?polygonId={id}`

Body:

```json
{
  "name": "Fazenda Daterra Coffee",
  "latitude": 18.9439,
  "longitude": 46.9925
}
```

Retorno:

- `coordinate`
- `polygon_sync` (sync automatico do poligono no mesmo fluxo)

#### `PUT /farm-monitoring/coordinates/{coordinate_id}?polygonId={id}`

- Atualiza coordenada e tambem sincroniza poligono automaticamente.

#### `DELETE /farm-monitoring/coordinates/{coordinate_id}`

- Remove coordenada.

---

## 3) Pipeline operacional

Prefixo: `/pipeline`

### `POST /pipeline/daily-ingestion`

Executa coleta diaria automatica:

- weather
- soil
- satellite
- atualizacao de `farm_monthly_features`

Retorno esperado:

```json
{
  "status": "success",
  "run_id": 1,
  "records_processed": 3,
  "details": {
    "weather": "ok",
    "soil": "ok",
    "satellite_items": 14,
    "monthly_features_rows": 1
  }
}
```

### `POST /pipeline/seasonal-forecast`

Executa integracao de previsao sazonal externa (Open-Meteo Climate):

- grava diario em `farm_seasonal_forecasts`;
- gera features de 6 e 12 meses em `farm_horizon_prediction_features`.

### `GET /pipeline/horizon-features?latitude={lat}&longitude={lon}`

- Retorna snapshot mais recente de features 6m e 12m.
- Se coordenada nao for enviada, usa coordenada padrao do usuario.

Retorno simplificado:

```json
{
  "user_id": 1,
  "latitude": 18.95,
  "longitude": 46.99,
  "features": {
    "6m": { "heat_risk_score": 0.688, "water_stress_score": 0.9949 },
    "12m": { "heat_risk_score": 0.3414, "water_stress_score": 0.9831 }
  }
}
```

### `GET /pipeline/horizon-features/history?latitude={lat}&longitude={lon}&limit={n}`

- Retorna serie historica para graficos de evolucao.
- Campos por ponto:
  - `reference_date`
  - `horizon_months` (6/12)
  - `projected_avg_temp_c`
  - `projected_total_precip_mm`
  - `projected_dry_days_ratio`
  - `heat_risk_score`
  - `water_stress_score`

---

## 4) LLM (analise e recomendacao)

Prefixo: `/llm`

### `POST /llm/predictions?latitude={lat}&longitude={lon}&limit={n}`

- Le dados monitorados + features de horizonte 6/12 meses;
- chama Gemini;
- retorna analise estruturada;
- persiste em `farm_ai_predictions`.

Estrutura da resposta:

```json
{
  "diagnostico": { "nivel_risco": "alto", "resumo": "..." },
  "predicoes": [{ "horizonte": "24h", "insight": "...", "confianca": 0.95 }],
  "acoes_recomendadas": [{ "prioridade": "alta", "acao": "...", "objetivo": "...", "prazo": "..." }],
  "alertas": ["..."],
  "metricas_chave": { "umidade_solo": "...", "temperatura_media": "...", "risco_climatico": "..." },
  "metadata": {
    "rows_analyzed": 4,
    "prediction_id": 3,
    "prompt_version": "v1.0.0",
    "model_name": "gemini-2.5-pro"
  }
}
```

---

## 5) Mapa no frontend (GeoJSON)

### Formato de coordenada do backend

- `geo_json` vem em `[lng, lat]`
- muitas libs frontend esperam `[lat, lng]`

### Helper pronto no projeto frontend

Arquivo:

- `src/lib/agromonitoring-map.ts`

Funcoes:

- `polygonToLeafletPositions(polygon)`
- `polygonCenterToLeaflet(polygon)`
- `estimateCircleFromArea(polygon)`

Uso recomendado:

1. buscar `GET /agromonitoring/polygons`;
2. converter para Leaflet com helper;
3. renderizar `Polygon` + `Circle` (opcional).

---

## 6) Fluxo recomendado de integracao frontend

### Inicializacao do painel

1. `GET /farm-monitoring/coordinates`
2. se vazio, criar via `POST /farm-monitoring/coordinates`
3. carregar `GET /pipeline/horizon-features`
4. carregar `GET /pipeline/horizon-features/history`

### Atualizacao operacional (diaria)

1. `POST /pipeline/daily-ingestion`
2. `POST /pipeline/seasonal-forecast` (periodico, ex: diario ou semanal)
3. `GET /pipeline/horizon-features`
4. `POST /llm/predictions`

### Atualizacao de coordenada no app

1. `PUT /farm-monitoring/coordinates/{id}`
2. backend sincroniza poligono automaticamente
3. recarregar dados de risco/horizonte

---

## 7) Tabelas backend relevantes para frontend

- `farm_coordinates`: coordenadas cadastradas
- `farm_monitoring_records`: observacoes de clima/solo/satelite/poligono
- `farm_monthly_features`: agregacao mensal
- `farm_seasonal_forecasts`: previsao sazonal diaria externa
- `farm_horizon_prediction_features`: features 6m/12m
- `farm_ai_predictions`: historico de analises LLM
- `farm_ingestion_runs`: execucoes do pipeline diario

---

## 8) Notas de implementacao frontend

- Sempre tratar timeout/retry para endpoints de pipeline e LLM.
- Para graficos:
  - usar `history[]` do endpoint de historico;
  - separar series por `horizon_months`.
- Para UX:
  - exibir `metadata.prediction_id` e `prompt_version` na tela de analise;
  - exibir badge de risco usando `heat_risk_score` e `water_stress_score`.
- Para consistencia:
  - manter timezone do frontend em UTC ou normalizar datas ISO recebidas.

---

## 9) Checklist de integracao (frontend)

- [ ] configurar `API_BASE_URL`
- [ ] integrar healthchecks
- [ ] integrar CRUD de coordenadas
- [ ] integrar mapa com helper `agromonitoring-map.ts`
- [ ] integrar pipeline diario
- [ ] integrar pipeline sazonal
- [ ] integrar `horizon-features` e `history`
- [ ] integrar tela de analise LLM
- [ ] implementar estados de loading/erro/retry
- [ ] validar fluxo completo em homologacao
