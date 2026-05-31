from __future__ import annotations

import asyncio
import json
import time
from datetime import UTC, date, datetime
from typing import Any, Awaitable, Callable

from sqlalchemy import text

from app.core.config import get_settings
from app.db.database import engine
from app.services.data_pipeline import run_daily_ingestion
from app.services.llm_predictions import generate_prediction
from app.services.seasonal_pipeline import run_seasonal_pipeline

settings = get_settings()
DEFAULT_LATITUDE = 18.9439
DEFAULT_LONGITUDE = 46.9925


def _get_default_user_id() -> int:
    sql = text("SELECT id FROM public.usuarios WHERE email = :email LIMIT 1")
    with engine.connect() as connection:
        user_id = connection.execute(sql, {"email": settings.default_user_email}).scalar_one_or_none()
    if user_id is None:
        raise RuntimeError(f"Default user not found: {settings.default_user_email}")
    return int(user_id)


def _resolve_coordinate(user_id: int) -> tuple[float, float]:
    sql = text(
        """
        SELECT latitude, longitude
        FROM public.farm_coordinates
        WHERE user_id = :user_id
        ORDER BY updated_at DESC
        LIMIT 1
        """
    )
    with engine.connect() as connection:
        row = connection.execute(sql, {"user_id": user_id}).mappings().one_or_none()
    if row:
        return float(row["latitude"]), float(row["longitude"])
    return DEFAULT_LATITUDE, DEFAULT_LONGITUDE


def _serialize_summary(result: dict[str, Any]) -> dict[str, Any]:
    summary_keys = (
        "status",
        "run_id",
        "records_processed",
        "saved_forecast_rows",
        "prediction_id",
        "metadata",
        "details",
    )
    summary: dict[str, Any] = {}
    for key in summary_keys:
        if key in result:
            summary[key] = result[key]
    return summary


async def _run_step_with_retry(
    *,
    step_name: str,
    step_fn: Callable[[], Awaitable[dict[str, Any]]],
    max_attempts: int = 3,
    base_delay_seconds: float = 1.5,
) -> tuple[bool, dict[str, Any], dict[str, Any] | None]:
    start_time = time.perf_counter()
    last_error_message = ""

    for attempt in range(1, max_attempts + 1):
        try:
            result = await step_fn()
            duration_ms = int((time.perf_counter() - start_time) * 1000)
            step_info = {
                "step": step_name,
                "status": "success",
                "attempts_used": attempt,
                "duration_ms": duration_ms,
                "summary": _serialize_summary(result),
            }
            return True, step_info, result
        except Exception as error:  # noqa: BLE001 - keep full error for observability
            last_error_message = str(error)
            if attempt < max_attempts:
                await asyncio.sleep(base_delay_seconds * attempt)

    duration_ms = int((time.perf_counter() - start_time) * 1000)
    step_info = {
        "step": step_name,
        "status": "failed",
        "attempts_used": max_attempts,
        "duration_ms": duration_ms,
        "error": last_error_message,
    }
    return False, step_info, None


def _save_run_state(
    *,
    run_id: int,
    status: str,
    steps: dict[str, Any],
    error_message: str | None,
    duration_ms: int | None,
    finished: bool,
) -> None:
    sql = text(
        """
        UPDATE public.farm_daily_full_runs
        SET status = :status,
            steps = CAST(:steps AS jsonb),
            error_message = :error_message,
            duration_ms = :duration_ms,
            finished_at = CASE WHEN :finished THEN NOW() ELSE finished_at END,
            updated_at = NOW()
        WHERE id = :run_id
        """
    )
    with engine.begin() as connection:
        connection.execute(
            sql,
            {
                "run_id": run_id,
                "status": status,
                "steps": json.dumps(steps, ensure_ascii=False),
                "error_message": error_message,
                "duration_ms": duration_ms,
                "finished": finished,
            },
        )


def _start_or_resume_run(
    *,
    user_id: int,
    latitude: float,
    longitude: float,
    trigger_source: str,
    force: bool,
) -> tuple[int | None, dict[str, Any] | None]:
    run_date = date.today()
    find_sql = text(
        """
        SELECT id, status, steps, started_at, finished_at
        FROM public.farm_daily_full_runs
        WHERE user_id = :user_id AND run_date = :run_date
        LIMIT 1
        """
    )
    with engine.connect() as connection:
        existing = connection.execute(
            find_sql, {"user_id": user_id, "run_date": run_date}
        ).mappings().one_or_none()

    if existing and existing["status"] == "success" and not force:
        return None, {
            "status": "skipped_already_successful",
            "run_id": int(existing["id"]),
            "run_date": run_date.isoformat(),
            "steps": existing["steps"],
            "started_at": existing["started_at"].isoformat() if existing["started_at"] else None,
            "finished_at": existing["finished_at"].isoformat() if existing["finished_at"] else None,
        }

    if existing:
        update_sql = text(
            """
            UPDATE public.farm_daily_full_runs
            SET latitude = :latitude,
                longitude = :longitude,
                trigger_source = :trigger_source,
                status = 'running',
                steps = '{}'::jsonb,
                error_message = NULL,
                duration_ms = NULL,
                started_at = NOW(),
                finished_at = NULL,
                updated_at = NOW()
            WHERE id = :run_id
            RETURNING id
            """
        )
        with engine.begin() as connection:
            run_id = connection.execute(
                update_sql,
                {
                    "run_id": int(existing["id"]),
                    "latitude": latitude,
                    "longitude": longitude,
                    "trigger_source": trigger_source,
                },
            ).scalar_one()
        return int(run_id), None

    insert_sql = text(
        """
        INSERT INTO public.farm_daily_full_runs (
            user_id, run_date, latitude, longitude, trigger_source, status, steps
        ) VALUES (
            :user_id, :run_date, :latitude, :longitude, :trigger_source, 'running', '{}'::jsonb
        )
        RETURNING id
        """
    )
    with engine.begin() as connection:
        run_id = connection.execute(
            insert_sql,
            {
                "user_id": user_id,
                "run_date": run_date,
                "latitude": latitude,
                "longitude": longitude,
                "trigger_source": trigger_source,
            },
        ).scalar_one()
    return int(run_id), None


async def run_daily_full(
    *,
    user_id: int | None = None,
    force: bool = False,
    trigger_source: str = "manual",
) -> dict[str, Any]:
    resolved_user_id = user_id or _get_default_user_id()
    latitude, longitude = _resolve_coordinate(resolved_user_id)
    run_id, skipped_payload = _start_or_resume_run(
        user_id=resolved_user_id,
        latitude=latitude,
        longitude=longitude,
        trigger_source=trigger_source,
        force=force,
    )
    if skipped_payload:
        return skipped_payload

    assert run_id is not None
    run_start = time.perf_counter()
    steps: dict[str, Any] = {}

    ok, ingestion_info, _ = await _run_step_with_retry(
        step_name="daily_ingestion",
        step_fn=lambda: run_daily_ingestion(user_id=resolved_user_id),
    )
    steps["daily_ingestion"] = ingestion_info
    if not ok:
        duration_ms = int((time.perf_counter() - run_start) * 1000)
        _save_run_state(
            run_id=run_id,
            status="failed",
            steps=steps,
            error_message=ingestion_info.get("error"),
            duration_ms=duration_ms,
            finished=True,
        )
        return {
            "status": "failed",
            "run_id": run_id,
            "steps": steps,
            "error": ingestion_info.get("error"),
        }

    ok, seasonal_info, _ = await _run_step_with_retry(
        step_name="seasonal_forecast",
        step_fn=lambda: run_seasonal_pipeline(user_id=resolved_user_id),
    )
    steps["seasonal_forecast"] = seasonal_info
    if not ok:
        duration_ms = int((time.perf_counter() - run_start) * 1000)
        _save_run_state(
            run_id=run_id,
            status="failed",
            steps=steps,
            error_message=seasonal_info.get("error"),
            duration_ms=duration_ms,
            finished=True,
        )
        return {
            "status": "failed",
            "run_id": run_id,
            "steps": steps,
            "error": seasonal_info.get("error"),
        }

    ok, llm_info, llm_result = await _run_step_with_retry(
        step_name="llm_prediction",
        step_fn=lambda: generate_prediction(
            user_id=resolved_user_id,
            latitude=latitude,
            longitude=longitude,
            limit=20,
        ),
    )
    steps["llm_prediction"] = llm_info
    if not ok:
        duration_ms = int((time.perf_counter() - run_start) * 1000)
        _save_run_state(
            run_id=run_id,
            status="failed",
            steps=steps,
            error_message=llm_info.get("error"),
            duration_ms=duration_ms,
            finished=True,
        )
        return {
            "status": "failed",
            "run_id": run_id,
            "steps": steps,
            "error": llm_info.get("error"),
        }

    duration_ms = int((time.perf_counter() - run_start) * 1000)
    _save_run_state(
        run_id=run_id,
        status="success",
        steps=steps,
        error_message=None,
        duration_ms=duration_ms,
        finished=True,
    )
    return {
        "status": "success",
        "run_id": run_id,
        "executed_at": datetime.now(tz=UTC).isoformat(),
        "user_id": resolved_user_id,
        "latitude": latitude,
        "longitude": longitude,
        "duration_ms": duration_ms,
        "steps": steps,
        "prediction_id": llm_result.get("metadata", {}).get("prediction_id") if llm_result else None,
    }


def get_latest_daily_full_run(*, user_id: int | None = None) -> dict[str, Any]:
    resolved_user_id = user_id or _get_default_user_id()
    sql = text(
        """
        SELECT id, run_date, status, steps, error_message, duration_ms, started_at, finished_at, updated_at
        FROM public.farm_daily_full_runs
        WHERE user_id = :user_id
        ORDER BY id DESC
        LIMIT 1
        """
    )
    with engine.connect() as connection:
        row = connection.execute(sql, {"user_id": resolved_user_id}).mappings().one_or_none()

    if not row:
        return {"status": "no_runs", "user_id": resolved_user_id}

    return {
        "id": int(row["id"]),
        "run_date": row["run_date"].isoformat(),
        "status": row["status"],
        "steps": row["steps"],
        "error_message": row["error_message"],
        "duration_ms": row["duration_ms"],
        "started_at": row["started_at"].isoformat() if row["started_at"] else None,
        "finished_at": row["finished_at"].isoformat() if row["finished_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
        "user_id": resolved_user_id,
    }
