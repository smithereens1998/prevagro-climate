from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import text

from app.core.config import get_settings
from app.db.database import engine
from app.integrations.agromonitoring import AgroMonitoringClient
from app.services.farm_monitoring import (
    upsert_satellite_analysis,
    upsert_soil_analysis,
    upsert_weather_analysis,
)

from app.services.coordinate_utils import resolve_effective_coordinate

settings = get_settings()
DEFAULT_POLYGON_ID = "6a1aec4cb5c0520008ea2893"


def _get_default_user_id() -> int:
    sql = text("SELECT id FROM public.usuarios WHERE email = :email LIMIT 1")
    with engine.connect() as connection:
        user_id = connection.execute(sql, {"email": settings.default_user_email}).scalar_one_or_none()
    if user_id is None:
        raise RuntimeError(f"Default user not found: {settings.default_user_email}")
    return int(user_id)


def _resolve_coordinate(user_id: int) -> tuple[float, float]:
    return resolve_effective_coordinate(user_id=user_id)


def _resolve_polygon_id() -> str:
    configured = settings.agromonitoring_farm_polygon_id.strip()
    return configured or DEFAULT_POLYGON_ID


def _start_ingestion_run(*, user_id: int, latitude: float, longitude: float, polygon_id: str) -> int:
    sql = text(
        """
        INSERT INTO public.farm_ingestion_runs (
            user_id, latitude, longitude, polygon_id, status, details
        ) VALUES (
            :user_id, :latitude, :longitude, :polygon_id, 'running', '{}'::jsonb
        )
        RETURNING id
        """
    )
    with engine.begin() as connection:
        run_id = connection.execute(
            sql,
            {
                "user_id": user_id,
                "latitude": latitude,
                "longitude": longitude,
                "polygon_id": polygon_id,
            },
        ).scalar_one()
    return int(run_id)


def _finish_ingestion_run(*, run_id: int, status: str, records_processed: int, details: dict[str, Any]) -> None:
    sql = text(
        """
        UPDATE public.farm_ingestion_runs
        SET status = :status,
            records_processed = :records_processed,
            details = CAST(:details AS jsonb),
            finished_at = NOW()
        WHERE id = :run_id
        """
    )
    with engine.begin() as connection:
        connection.execute(
            sql,
            {
                "run_id": run_id,
                "status": status,
                "records_processed": records_processed,
                "details": json.dumps(details, ensure_ascii=False),
            },
        )


def rebuild_monthly_features(
    *,
    user_id: int,
    latitude: float,
    longitude: float,
) -> int:
    sql = text(
        """
        INSERT INTO public.farm_monthly_features (
            user_id,
            latitude,
            longitude,
            year_month,
            samples_total,
            weather_samples,
            soil_samples,
            satellite_samples,
            avg_temp_celsius,
            min_temp_celsius,
            max_temp_celsius,
            avg_humidity_percent,
            avg_soil_moisture,
            avg_soil_temp_surface_celsius,
            avg_soil_temp_10cm_celsius,
            updated_at
        )
        SELECT
            user_id,
            latitude,
            longitude,
            DATE_TRUNC('month', observed_at)::date AS year_month,
            COUNT(*) AS samples_total,
            COUNT(*) FILTER (WHERE weather_temp_celsius IS NOT NULL) AS weather_samples,
            COUNT(*) FILTER (WHERE soil_moisture IS NOT NULL) AS soil_samples,
            COUNT(*) FILTER (WHERE satellite_source IS NOT NULL) AS satellite_samples,
            AVG(weather_temp_celsius) AS avg_temp_celsius,
            MIN(weather_temp_celsius) AS min_temp_celsius,
            MAX(weather_temp_celsius) AS max_temp_celsius,
            AVG(weather_humidity_percent) AS avg_humidity_percent,
            AVG(soil_moisture) AS avg_soil_moisture,
            AVG(soil_temp_surface_celsius) AS avg_soil_temp_surface_celsius,
            AVG(soil_temp_10cm_celsius) AS avg_soil_temp_10cm_celsius,
            NOW() AS updated_at
        FROM public.farm_monitoring_records
        WHERE user_id = :user_id
          AND latitude = :latitude
          AND longitude = :longitude
        GROUP BY user_id, latitude, longitude, DATE_TRUNC('month', observed_at)::date
        ON CONFLICT (user_id, latitude, longitude, year_month)
        DO UPDATE SET
            samples_total = EXCLUDED.samples_total,
            weather_samples = EXCLUDED.weather_samples,
            soil_samples = EXCLUDED.soil_samples,
            satellite_samples = EXCLUDED.satellite_samples,
            avg_temp_celsius = EXCLUDED.avg_temp_celsius,
            min_temp_celsius = EXCLUDED.min_temp_celsius,
            max_temp_celsius = EXCLUDED.max_temp_celsius,
            avg_humidity_percent = EXCLUDED.avg_humidity_percent,
            avg_soil_moisture = EXCLUDED.avg_soil_moisture,
            avg_soil_temp_surface_celsius = EXCLUDED.avg_soil_temp_surface_celsius,
            avg_soil_temp_10cm_celsius = EXCLUDED.avg_soil_temp_10cm_celsius,
            updated_at = NOW()
        """
    )

    with engine.begin() as connection:
        result = connection.execute(
            sql,
            {"user_id": user_id, "latitude": latitude, "longitude": longitude},
        )
    return result.rowcount or 0


async def run_daily_ingestion(*, user_id: int | None = None) -> dict[str, Any]:
    resolved_user_id = user_id or _get_default_user_id()
    latitude, longitude = _resolve_coordinate(resolved_user_id)
    polygon_id = _resolve_polygon_id()
    run_id = _start_ingestion_run(
        user_id=resolved_user_id,
        latitude=latitude,
        longitude=longitude,
        polygon_id=polygon_id,
    )

    processed = 0
    details: dict[str, Any] = {}
    try:
        client = AgroMonitoringClient()

        weather_data = await client.get_weather(lat=latitude, lon=longitude)
        upsert_weather_analysis(
            latitude=latitude,
            longitude=longitude,
            weather_data=weather_data,
            user_id=resolved_user_id,
        )
        processed += 1
        details["weather"] = "ok"

        soil_data = await client.get_soil(lat=latitude, lon=longitude)
        upsert_soil_analysis(
            latitude=latitude,
            longitude=longitude,
            soil_data=soil_data,
            user_id=resolved_user_id,
        )
        processed += 1
        details["soil"] = "ok"

        polygon_data = await client.get_polygon(polygon_id)
        end_unix = int(datetime.now(tz=UTC).timestamp())
        start_unix = int((datetime.now(tz=UTC) - timedelta(days=30)).timestamp())
        satellite_data = await client.get_satellite_history(
            polygon_id=polygon_id,
            start_unix=start_unix,
            end_unix=end_unix,
        )
        upsert_satellite_analysis(
            latitude=latitude,
            longitude=longitude,
            satellite_data=satellite_data,
            analysis_kind="daily_ingestion_satellite",
            polygon_data=polygon_data,
            user_id=resolved_user_id,
        )
        processed += 1
        details["satellite_items"] = len(satellite_data)

        monthly_rows = rebuild_monthly_features(
            user_id=resolved_user_id,
            latitude=latitude,
            longitude=longitude,
        )
        details["monthly_features_rows"] = monthly_rows

        _finish_ingestion_run(
            run_id=run_id,
            status="success",
            records_processed=processed,
            details=details,
        )
        return {
            "status": "success",
            "run_id": run_id,
            "user_id": resolved_user_id,
            "latitude": latitude,
            "longitude": longitude,
            "polygon_id": polygon_id,
            "records_processed": processed,
            "details": details,
        }
    except Exception as error:
        details["error"] = str(error)
        _finish_ingestion_run(
            run_id=run_id,
            status="failed",
            records_processed=processed,
            details=details,
        )
        raise
