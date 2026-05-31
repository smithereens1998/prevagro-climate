from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from app.services.llm_predictions import generate_prediction

router = APIRouter(prefix="/llm", tags=["llm"])


@router.post("/predictions")
async def create_prediction(
    latitude: float | None = Query(None, ge=-90, le=90),
    longitude: float | None = Query(None, ge=-180, le=180),
    limit: int = Query(20, ge=1, le=100),
) -> dict[str, Any]:
    return await generate_prediction(
        latitude=latitude,
        longitude=longitude,
        limit=limit,
    )
