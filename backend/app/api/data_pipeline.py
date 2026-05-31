from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from app.services.daily_full_pipeline import get_latest_daily_full_run, run_daily_full
from app.services.data_pipeline import run_daily_ingestion

router = APIRouter(prefix="/pipeline", tags=["pipeline"])


@router.post("/daily-ingestion")
async def run_pipeline_daily_ingestion() -> dict[str, Any]:
    return await run_daily_ingestion()


@router.post("/daily-full")
async def run_pipeline_daily_full(
    force: bool = Query(False, description="Re-run even if today's run already succeeded"),
    trigger_source: str = Query("manual", description="manual|scheduler|api"),
) -> dict[str, Any]:
    return await run_daily_full(force=force, trigger_source=trigger_source)


@router.put("/manual-refresh")
async def run_pipeline_manual_refresh() -> dict[str, Any]:
    return await run_daily_full(force=True, trigger_source="frontend_manual_refresh")


@router.get("/daily-full/latest")
def get_pipeline_daily_full_latest() -> dict[str, Any]:
    return get_latest_daily_full_run()
