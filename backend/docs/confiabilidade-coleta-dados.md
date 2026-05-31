# Confiabilidade da Coleta de Dados - Prevagro Climate

## Objetivo

Este documento define a base tecnica de confiabilidade da coleta de dados usada no backend do projeto, cobrindo:

- fontes satelitais e meteorologicas;
- periodicidade de revisita;
- credibilidade e reconhecimento da API;
- riscos conhecidos de qualidade;
- controles de qualidade implementados no pipeline;
- recomendacoes para operacao e auditoria.

## Fonte principal de dados

- API base: `https://api.agromonitoring.com/agro/1.0`
- Provedor: AgroMonitoring (ecossistema OpenWeather para Agro API)
- Uso no projeto:
  - poligonos (`/polygons`);
  - clima atual (`/weather`);
  - solo atual (`/soil`);
  - busca de imagens satelitais e metadados (`/image/search`);
  - historico para indices de vegetacao (via metadados/estatisticas de imagens).

## Satelites usados e periodicidade

Pelo proprio material tecnico da AgroMonitoring, os produtos de vegetacao e imagens usam principalmente:

- Sentinel-2;
- Landsat-8 (complementado por Landsat no ecossistema USGS).

Periodicidade esperada:

- Sentinel-2:
  - 10 dias por satelite;
  - 5 dias em constelacao nominal;
  - em medias latitudes, pode chegar a 2-3 dias por sobreposicao de faixa.
- Landsat-8:
  - 16 dias por satelite;
  - no ecossistema Landsat 8 + 9, cobertura efetiva de 8 dias.

Observacao pratica para AgroMonitoring:

- a propria doc informa que janela curta pode nao retornar cena;
- menciona variacao de 3-5 dias para Sentinel-2 (dependente de latitude) e 16 dias para Landsat-8.

## Credibilidade e reconhecimento de qualidade

### Pontos fortes

- Baseado em missoes satelitais reconhecidas globalmente:
  - Copernicus Sentinel (UE/ESA);
  - Landsat (USGS/NASA).
- Metadados de qualidade por cena:
  - `cl` (cloud cover aproximado);
  - `dc` (data coverage valido aproximado no poligono);
  - `type` (fonte da cena: Landsat-8 ou Sentinel-2);
  - `dt` (timestamp da aquisicao).
- API orientada a poligono, adequada para agricultura de precisao.

### Limites tecnicos

- Qualidade depende de cobertura de nuvens e disponibilidade orbital.
- Periodicidade real varia por latitude e sazonalidade.
- Alguns indices/estatisticas sao especificos por sensor.
- API nao substitui modelagem climatica dedicada por si so para janelas de 30 dias.

## Qualidade de dados no projeto (estado operacional)

Pipeline atual implementado no backend:

- ingestao diaria automatica:
  - weather;
  - soil;
  - satellite history;
- agregacao mensal:
  - tabela `farm_monthly_features`;
- previsao sazonal externa:
  - Open-Meteo Climate API;
  - tabela `farm_seasonal_forecasts`;
- features de horizonte:
  - 30 dias;
  - tabela `farm_horizon_prediction_features`;
- analise LLM persistida:
  - tabela `farm_ai_predictions`.

## Controles de confiabilidade recomendados (SLO/SLA interno)

### 1) Integridade de ingestao

- taxa de sucesso do job diario >= 98% mensal;
- `records_processed` esperado por execucao: minimo 3 (weather/soil/satellite);
- alerta se `status = failed` em `farm_ingestion_runs`.

### 2) Completude

- weather preenchido em pelo menos 1 amostra diaria;
- soil preenchido em pelo menos 1 amostra diaria;
- satellite com `satellite_items > 0` na janela de 30 dias;
- alertar quando qualquer bloco ficar vazio por mais de 48h.

### 3) Qualidade satelital por cena

Filtros minimos sugeridos no consumo:

- rejeitar cenas com cloud cover (`cl`) acima de limiar operativo (ex: 70%);
- priorizar cenas com melhor cobertura valida (`dc`);
- manter trilha da fonte (`type`) para auditoria.

### 4) Consistencia espacial

- validar `polygon_geojson` e coordenadas usadas na coleta;
- rastrear divergencia entre centro do poligono e coordenada operacional;
- bloquear analise se mismatch geografico critico.

### 5) Rastreabilidade

- toda previsao LLM deve manter:
  - `prompt_version`;
  - `model_name`;
  - `input_snapshot`;
  - `response_json`;
  - timestamp.

## Viabilidade de previsao para 30 dias

Sim, e possivel em termos praticos se tratada como previsao probabilistica:

- usar sazonalidade externa + historico local agregado;
- atualizar features por horizonte de 30 dias;
- interpretar saida como risco/cenario, nao como previsao deterministica diaria.

No projeto, esta base ja esta habilitada com:

- `farm_seasonal_forecasts`;
- `farm_horizon_prediction_features`;
- enriquecimento da LLM com features de 30 dias.

## Referencias tecnicas

- AgroMonitoring API docs: <https://agromonitoring.com/api>
- AgroMonitoring satellite docs: <https://agromonitoring.com/api/images>
- AgroMonitoring dashboard satellite docs: <https://agromonitoring.com/dashboard/dashboard-satellite>
- Sentinel-2 mission (Copernicus): <https://dataspace.copernicus.eu/data-collections/copernicus-sentinel-missions/sentinel-2>
- Sentinel-2 handbook (ESA): <https://sentinels.copernicus.eu/documents/247904/685211/Sentinel-2_User_Handbook.pdf/8869acdf-fd84-43ec-ae8c-3e80a436a16c?t=1438278087000>
- Landsat-8 (USGS): <https://www.usgs.gov/landsat-missions/landsat-8>
- Landsat acquisition schedule (USGS): <https://www.usgs.gov/faqs/what-are-acquisition-schedules-landsat-satellites?qt-news_science_products=0>
