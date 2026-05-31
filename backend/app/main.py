from fastapi import FastAPI
from fastapi import HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api.agromonitoring import router as agromonitoring_router
from app.api.data_pipeline import router as data_pipeline_router
from app.api.farm_monitoring import router as farm_monitoring_router
from app.api.llm_predictions import router as llm_predictions_router
from app.api.seasonal_pipeline import router as seasonal_pipeline_router
from app.db.database import check_database_connection

app = FastAPI(
    title="Prevagro Climate Backend",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",
        "http://localhost:8081",
        "http://localhost:8082",
        "http://127.0.0.1:8080",
        "http://127.0.0.1:8081",
        "http://127.0.0.1:8082",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["health"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/db", tags=["health"])
def database_health_check() -> dict[str, str]:
    is_connected = check_database_connection()
    if not is_connected:
        raise HTTPException(status_code=503, detail="Database unavailable")

    return {"status": "ok"}


app.include_router(agromonitoring_router)
app.include_router(farm_monitoring_router)
app.include_router(llm_predictions_router)
app.include_router(data_pipeline_router)
app.include_router(seasonal_pipeline_router)
