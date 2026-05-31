# Backend FastAPI

## Setup

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```powershell
uvicorn app.main:app --reload
```

## Database setup script

Create/update SQL structures in PostgreSQL using `.env` credentials:

```powershell
python scripts/run_db_setup.py
```

Seed default application user:

```powershell
python scripts/seed_default_user.py
```

Main table created:

- `public.farm_monitoring_records`

## Environment variables

Configure in `backend/.env`:

- `DATABASE_URL`
- `AGROMONITORING_API_KEY`
- `AGROMONITORING_BASE_URL` (default: `https://api.agromonitoring.com/agro/1.0`)
- `AGROMONITORING_TIMEOUT_SECONDS` (default: `20`)
- `GEMINI_MODEL`
- `GEMINI_API_KEY`

API docs:

- Swagger UI: <http://127.0.0.1:8000/docs>
- ReDoc: <http://127.0.0.1:8000/redoc>
- DB health: <http://127.0.0.1:8000/health/db>

AgroMonitoring routes:

- `GET /agromonitoring/polygons`
- `GET /agromonitoring/polygons/{polygon_id}`
- `GET /agromonitoring/weather?lat={lat}&lon={lon}`
- `GET /agromonitoring/soil?lat={lat}&lon={lon}`
- `GET /agromonitoring/satellite/history?polygonId={id}&start={unix}&end={unix}`
- `GET /agromonitoring/vegetation/indices?polygonId={id}&start={unix}&end={unix}`

Farm monitoring persistence routes:

- `PUT /farm-monitoring/weather?latitude={lat}&longitude={lon}`
- `PUT /farm-monitoring/soil?latitude={lat}&longitude={lon}`
- `PUT /farm-monitoring/polygon?polygonId={id}&latitude={lat}&longitude={lon}`
- `PUT /farm-monitoring/satellite/history?polygonId={id}&start={unix}&end={unix}&latitude={lat}&longitude={lon}`
- `PUT /farm-monitoring/vegetation/indices?polygonId={id}&start={unix}&end={unix}&latitude={lat}&longitude={lon}`
- `GET /farm-monitoring/coordinates`
- `GET /farm-monitoring/latest` (latest `farm_name`, `farm_location`, `latitude`, `longitude`)
- `POST /farm-monitoring/coordinates?polygonId={id}` (optional `polygonId`; auto-sync polygon)
- `PUT /farm-monitoring/coordinates/{coordinate_id}?polygonId={id}` (optional `polygonId`; auto-sync polygon)
- `DELETE /farm-monitoring/coordinates/{coordinate_id}`

LLM prediction route:

- `POST /llm/predictions?latitude={lat}&longitude={lon}&limit={n}`

LLM prediction persistence table:

- `public.farm_ai_predictions`

LLM test script (prints analysis in terminal):

```powershell
python scripts/test_llm_prediction.py
```

Daily ingestion + monthly features pipeline:

- Endpoint: `POST /pipeline/daily-ingestion`
- Endpoint: `POST /pipeline/daily-full?force={bool}&trigger_source={manual|scheduler|api}`
- Endpoint: `GET /pipeline/daily-full/latest`
- Script: `python scripts/run_daily_ingestion.py`
- Script: `python scripts/run_daily_full.py`
- Windows scheduler script: `powershell -ExecutionPolicy Bypass -File scripts/schedule_daily_full_task.ps1`
- Tables:
  - `public.farm_ingestion_runs`
  - `public.farm_monthly_features`
  - `public.farm_daily_full_runs`

Seasonal forecast + horizon features pipeline (6/12 months):

- Endpoint: `POST /pipeline/seasonal-forecast`
- Endpoint: `GET /pipeline/horizon-features?latitude={lat}&longitude={lon}`
- Endpoint: `GET /pipeline/horizon-features/history?latitude={lat}&longitude={lon}&limit={n}`
- Script: `python scripts/run_seasonal_pipeline.py`
- Validation script: `python scripts/validate_seasonal_pipeline.py`
- Tables:
  - `public.farm_seasonal_forecasts`
  - `public.farm_horizon_prediction_features`

If `polygonId` is not provided in `POST/PUT /coordinates`, backend fallback order is:
1) `AGROMONITORING_FARM_POLYGON_ID` in `.env`
2) built-in default polygon id available in the API layer
