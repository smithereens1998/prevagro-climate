from __future__ import annotations

import json
from datetime import UTC, date, datetime
from statistics import mean
from typing import Any

from sqlalchemy import text

from app.core.config import get_settings
from app.db.database import engine
from app.integrations.seasonal_forecast import SeasonalForecastClient

settings = get_settings()
DEFAULT_LATITUDE = 18.9439
DEFAULT_LONGITUDE = 46.9925
SOURCE_NAME = "open-meteo-climate"


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


def _to_date(value: str) -> date:
    return datetime.strptime(value, "%Y-%m-%d").date()


def _save_daily_forecast_rows(
    *,
    user_id: int,
    latitude: float,
    longitude: float,
    model_name: str,
    payload: dict[str, Any],
) -> int:
    daily = payload.get("daily", {})
    dates = daily.get("time", [])
    temp_mean = daily.get("temperature_2m_mean", [])
    temp_max = daily.get("temperature_2m_max", [])
    temp_min = daily.get("temperature_2m_min", [])
    precipitation = daily.get("precipitation_sum", [])

    if not isinstance(dates, list):
        return 0

    sql = text(
        """
        INSERT INTO public.farm_seasonal_forecasts (
            user_id,
            latitude,
            longitude,
            source_name,
            model_name,
            forecast_date,
            temp_mean_c,
            temp_max_c,
            temp_min_c,
            precipitation_mm,
            dry_day_flag,
            raw_payload
        ) VALUES (
            :user_id,
            :latitude,
            :longitude,
            :source_name,
            :model_name,
            :forecast_date,
            :temp_mean_c,
            :temp_max_c,
            :temp_min_c,
            :precipitation_mm,
            :dry_day_flag,
            CAST(:raw_payload AS jsonb)
        )
        ON CONFLICT (user_id, latitude, longitude, source_name, model_name, forecast_date)
        DO UPDATE SET
            temp_mean_c = EXCLUDED.temp_mean_c,
            temp_max_c = EXCLUDED.temp_max_c,
            temp_min_c = EXCLUDED.temp_min_c,
            precipitation_mm = EXCLUDED.precipitation_mm,
            dry_day_flag = EXCLUDED.dry_day_flag,
            raw_payload = EXCLUDED.raw_payload
        """
    )

    inserted = 0
    with engine.begin() as connection:
        for idx, date_value in enumerate(dates):
            precip_value = precipitation[idx] if idx < len(precipitation) else None
            row_payload = {
                "time": date_value,
                "temperature_2m_mean": temp_mean[idx] if idx < len(temp_mean) else None,
                "temperature_2m_max": temp_max[idx] if idx < len(temp_max) else None,
                "temperature_2m_min": temp_min[idx] if idx < len(temp_min) else None,
                "precipitation_sum": precip_value,
            }
            connection.execute(
                sql,
                {
                    "user_id": user_id,
                    "latitude": latitude,
                    "longitude": longitude,
                    "source_name": SOURCE_NAME,
                    "model_name": model_name,
                    "forecast_date": _to_date(date_value),
                    "temp_mean_c": row_payload["temperature_2m_mean"],
                    "temp_max_c": row_payload["temperature_2m_max"],
                    "temp_min_c": row_payload["temperature_2m_min"],
                    "precipitation_mm": precip_value,
                    "dry_day_flag": bool((precip_value or 0) < 1.0),
                    "raw_payload": json.dumps(row_payload),
                },
            )
            inserted += 1

    return inserted


def _compute_horizon_features(
    *,
    user_id: int,
    latitude: float,
    longitude: float,
    horizon_months: int,
) -> dict[str, Any]:
    seasonal_sql = text(
        """
        SELECT forecast_date, temp_mean_c, precipitation_mm, dry_day_flag
        FROM public.farm_seasonal_forecasts
        WHERE user_id = :user_id
          AND latitude = :latitude
          AND longitude = :longitude
          AND forecast_date >= CURRENT_DATE
          AND forecast_date < (CURRENT_DATE + (:horizon_days || ' days')::interval)
        ORDER BY forecast_date ASC
        """
    )
    horizon_days = 30 * horizon_months
    with engine.connect() as connection:
        seasonal_rows = connection.execute(
            seasonal_sql,
            {
                "user_id": user_id,
                "latitude": latitude,
                "longitude": longitude,
                "horizon_days": horizon_days,
            },
        ).mappings().all()

    history_sql = text(
        """
        SELECT avg_temp_celsius, avg_soil_moisture
        FROM public.farm_monthly_features
        WHERE user_id = :user_id
          AND latitude = :latitude
          AND longitude = :longitude
        ORDER BY year_month DESC
        LIMIT 12
        """
    )
    with engine.connect() as connection:
        history_rows = connection.execute(
            history_sql,
            {"user_id": user_id, "latitude": latitude, "longitude": longitude},
        ).mappings().all()

    temps = [float(row["temp_mean_c"]) for row in seasonal_rows if row["temp_mean_c"] is not None]
    precs = [float(row["precipitation_mm"]) for row in seasonal_rows if row["precipitation_mm"] is not None]
    dry_flags = [1.0 if row["dry_day_flag"] else 0.0 for row in seasonal_rows]

    baseline_temp_values = [float(row["avg_temp_celsius"]) for row in history_rows if row["avg_temp_celsius"] is not None]
    baseline_soil_values = [float(row["avg_soil_moisture"]) for row in history_rows if row["avg_soil_moisture"] is not None]

    projected_avg_temp = mean(temps) if temps else None
    projected_total_precip = sum(precs) if precs else None
    projected_dry_ratio = mean(dry_flags) if dry_flags else None
    baseline_avg_temp = mean(baseline_temp_values) if baseline_temp_values else None
    baseline_avg_soil = mean(baseline_soil_values) if baseline_soil_values else None

    heat_risk_score = None
    if projected_avg_temp is not None:
        heat_risk_score = min(max((projected_avg_temp - 24.0) / 12.0, 0.0), 1.0)

    water_stress_score = None
    if projected_total_precip is not None and baseline_avg_soil is not None:
        dryness_component = (projected_dry_ratio or 0.0) * 0.6
        precip_component = min(max((120.0 - projected_total_precip) / 120.0, 0.0), 1.0) * 0.4
        water_stress_score = min(max(dryness_component + precip_component, 0.0), 1.0)

    return {
        "projected_avg_temp_c": projected_avg_temp,
        "projected_total_precip_mm": projected_total_precip,
        "projected_dry_days_ratio": projected_dry_ratio,
        "baseline_avg_soil_moisture": baseline_avg_soil,
        "baseline_avg_temp_c": baseline_avg_temp,
        "heat_risk_score": heat_risk_score,
        "water_stress_score": water_stress_score,
        "samples_used": len(seasonal_rows),
        "horizon_months": horizon_months,
    }


def _save_horizon_features(
    *,
    user_id: int,
    latitude: float,
    longitude: float,
    feature_data: dict[str, Any],
) -> None:
    sql = text(
        """
        INSERT INTO public.farm_horizon_prediction_features (
            user_id,
            latitude,
            longitude,
            reference_date,
            horizon_months,
            projected_avg_temp_c,
            projected_total_precip_mm,
            projected_dry_days_ratio,
            baseline_avg_soil_moisture,
            baseline_avg_temp_c,
            heat_risk_score,
            water_stress_score,
            feature_payload,
            updated_at
        ) VALUES (
            :user_id,
            :latitude,
            :longitude,
            CURRENT_DATE,
            :horizon_months,
            :projected_avg_temp_c,
            :projected_total_precip_mm,
            :projected_dry_days_ratio,
            :baseline_avg_soil_moisture,
            :baseline_avg_temp_c,
            :heat_risk_score,
            :water_stress_score,
            CAST(:feature_payload AS jsonb),
            NOW()
        )
        ON CONFLICT (user_id, latitude, longitude, reference_date, horizon_months)
        DO UPDATE SET
            projected_avg_temp_c = EXCLUDED.projected_avg_temp_c,
            projected_total_precip_mm = EXCLUDED.projected_total_precip_mm,
            projected_dry_days_ratio = EXCLUDED.projected_dry_days_ratio,
            baseline_avg_soil_moisture = EXCLUDED.baseline_avg_soil_moisture,
            baseline_avg_temp_c = EXCLUDED.baseline_avg_temp_c,
            heat_risk_score = EXCLUDED.heat_risk_score,
            water_stress_score = EXCLUDED.water_stress_score,
            feature_payload = EXCLUDED.feature_payload,
            updated_at = NOW()
        """
    )

    with engine.begin() as connection:
        connection.execute(
            sql,
            {
                "user_id": user_id,
                "latitude": latitude,
                "longitude": longitude,
                "horizon_months": feature_data["horizon_months"],
                "projected_avg_temp_c": feature_data["projected_avg_temp_c"],
                "projected_total_precip_mm": feature_data["projected_total_precip_mm"],
                "projected_dry_days_ratio": feature_data["projected_dry_days_ratio"],
                "baseline_avg_soil_moisture": feature_data["baseline_avg_soil_moisture"],
                "baseline_avg_temp_c": feature_data["baseline_avg_temp_c"],
                "heat_risk_score": feature_data["heat_risk_score"],
                "water_stress_score": feature_data["water_stress_score"],
                "feature_payload": json.dumps(feature_data, ensure_ascii=False),
            },
        )


async def run_seasonal_pipeline(*, user_id: int | None = None) -> dict[str, Any]:
    resolved_user_id = user_id or _get_default_user_id()
    latitude, longitude = _resolve_coordinate(resolved_user_id)

    start_date = date.today()
    end_date = date(start_date.year + 1, start_date.month, start_date.day)

    client = SeasonalForecastClient()
    payload = await client.fetch_daily_forecast(
        latitude=latitude,
        longitude=longitude,
        start_date=start_date,
        end_date=end_date,
    )

    saved_rows = _save_daily_forecast_rows(
        user_id=resolved_user_id,
        latitude=latitude,
        longitude=longitude,
        model_name=settings.seasonal_forecast_model,
        payload=payload,
    )

    feature_6m = _compute_horizon_features(
        user_id=resolved_user_id,
        latitude=latitude,
        longitude=longitude,
        horizon_months=6,
    )
    _save_horizon_features(
        user_id=resolved_user_id,
        latitude=latitude,
        longitude=longitude,
        feature_data=feature_6m,
    )

    feature_12m = _compute_horizon_features(
        user_id=resolved_user_id,
        latitude=latitude,
        longitude=longitude,
        horizon_months=12,
    )
    _save_horizon_features(
        user_id=resolved_user_id,
        latitude=latitude,
        longitude=longitude,
        feature_data=feature_12m,
    )

    return {
        "status": "success",
        "user_id": resolved_user_id,
        "latitude": latitude,
        "longitude": longitude,
        "source_name": SOURCE_NAME,
        "model_name": settings.seasonal_forecast_model,
        "saved_forecast_rows": saved_rows,
        "features": {"6m": feature_6m, "12m": feature_12m},
    }


def get_latest_horizon_features(
    *,
    user_id: int | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
) -> dict[str, Any]:
    resolved_user_id = user_id or _get_default_user_id()
    resolved_latitude, resolved_longitude = (
        (latitude, longitude)
        if latitude is not None and longitude is not None
        else _resolve_coordinate(resolved_user_id)
    )

    sql = text(
        """
        SELECT
            reference_date,
            horizon_months,
            projected_avg_temp_c,
            projected_total_precip_mm,
            projected_dry_days_ratio,
            baseline_avg_soil_moisture,
            baseline_avg_temp_c,
            heat_risk_score,
            water_stress_score,
            feature_payload
        FROM public.farm_horizon_prediction_features
        WHERE user_id = :user_id
          AND latitude = :latitude
          AND longitude = :longitude
        ORDER BY reference_date DESC, horizon_months ASC
        LIMIT 2
        """
    )

    with engine.connect() as connection:
        rows = connection.execute(
            sql,
            {
                "user_id": resolved_user_id,
                "latitude": resolved_latitude,
                "longitude": resolved_longitude,
            },
        ).mappings().all()

    features: dict[str, Any] = {}
    for row in rows:
        horizon = f"{int(row['horizon_months'])}m"
        features[horizon] = {
            "reference_date": row["reference_date"].isoformat(),
            "projected_avg_temp_c": float(row["projected_avg_temp_c"]) if row["projected_avg_temp_c"] is not None else None,
            "projected_total_precip_mm": float(row["projected_total_precip_mm"])
            if row["projected_total_precip_mm"] is not None
            else None,
            "projected_dry_days_ratio": float(row["projected_dry_days_ratio"])
            if row["projected_dry_days_ratio"] is not None
            else None,
            "baseline_avg_soil_moisture": float(row["baseline_avg_soil_moisture"])
            if row["baseline_avg_soil_moisture"] is not None
            else None,
            "baseline_avg_temp_c": float(row["baseline_avg_temp_c"]) if row["baseline_avg_temp_c"] is not None else None,
            "heat_risk_score": float(row["heat_risk_score"]) if row["heat_risk_score"] is not None else None,
            "water_stress_score": float(row["water_stress_score"]) if row["water_stress_score"] is not None else None,
            "feature_payload": row["feature_payload"],
        }

    return {
        "user_id": resolved_user_id,
        "latitude": resolved_latitude,
        "longitude": resolved_longitude,
        "features": features,
    }


def get_horizon_features_history(
    *,
    user_id: int | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    limit: int = 120,
) -> dict[str, Any]:
    resolved_user_id = user_id or _get_default_user_id()
    resolved_latitude, resolved_longitude = (
        (latitude, longitude)
        if latitude is not None and longitude is not None
        else _resolve_coordinate(resolved_user_id)
    )

    sql = text(
        """
        SELECT
            reference_date,
            horizon_months,
            projected_avg_temp_c,
            projected_total_precip_mm,
            projected_dry_days_ratio,
            baseline_avg_soil_moisture,
            baseline_avg_temp_c,
            heat_risk_score,
            water_stress_score
        FROM public.farm_horizon_prediction_features
        WHERE user_id = :user_id
          AND latitude = :latitude
          AND longitude = :longitude
        ORDER BY reference_date DESC, horizon_months ASC
        LIMIT :limit
        """
    )

    with engine.connect() as connection:
        rows = connection.execute(
            sql,
            {
                "user_id": resolved_user_id,
                "latitude": resolved_latitude,
                "longitude": resolved_longitude,
                "limit": limit,
            },
        ).mappings().all()

    history: list[dict[str, Any]] = []
    for row in rows:
        history.append(
            {
                "reference_date": row["reference_date"].isoformat(),
                "horizon_months": int(row["horizon_months"]),
                "projected_avg_temp_c": float(row["projected_avg_temp_c"])
                if row["projected_avg_temp_c"] is not None
                else None,
                "projected_total_precip_mm": float(row["projected_total_precip_mm"])
                if row["projected_total_precip_mm"] is not None
                else None,
                "projected_dry_days_ratio": float(row["projected_dry_days_ratio"])
                if row["projected_dry_days_ratio"] is not None
                else None,
                "baseline_avg_soil_moisture": float(row["baseline_avg_soil_moisture"])
                if row["baseline_avg_soil_moisture"] is not None
                else None,
                "baseline_avg_temp_c": float(row["baseline_avg_temp_c"])
                if row["baseline_avg_temp_c"] is not None
                else None,
                "heat_risk_score": float(row["heat_risk_score"]) if row["heat_risk_score"] is not None else None,
                "water_stress_score": float(row["water_stress_score"])
                if row["water_stress_score"] is not None
                else None,
            }
        )

    return {
        "user_id": resolved_user_id,
        "latitude": resolved_latitude,
        "longitude": resolved_longitude,
        "count": len(history),
        "history": history,
    }
