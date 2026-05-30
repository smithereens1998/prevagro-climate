from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from app.services.data_pipeline import run_daily_ingestion

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.post("/daily-ingestion")
async def run_pipeline_daily_ingestion() -> dict[str, Any]:
    return await run_daily_ingestion()
