from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from app.services.seasonal_pipeline import (
    get_horizon_features_history,
    get_latest_horizon_features,
    run_seasonal_pipeline,
)

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.post("/seasonal-forecast")
async def run_pipeline_seasonal_forecast() -> dict[str, Any]:
    return await run_seasonal_pipeline()


@router.get("/horizon-features")
def get_pipeline_horizon_features(
    latitude: float | None = Query(None, ge=-90, le=90),
    longitude: float | None = Query(None, ge=-180, le=180),
) -> dict[str, Any]:
    return get_latest_horizon_features(latitude=latitude, longitude=longitude)


@router.get("/horizon-features/history")
def get_pipeline_horizon_features_history(
    latitude: float | None = Query(None, ge=-90, le=90),
    longitude: float | None = Query(None, ge=-180, le=180),
    limit: int = Query(120, ge=1, le=1000),
) -> dict[str, Any]:
    return get_horizon_features_history(
        latitude=latitude,
        longitude=longitude,
        limit=limit,
    )
