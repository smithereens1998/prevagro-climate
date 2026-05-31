from __future__ import annotations

import json
from functools import lru_cache
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import text

from app.core.config import get_settings
from app.db.database import engine

settings = get_settings()


def _kelvin_to_celsius(temperature_kelvin: float) -> float:
    return round(temperature_kelvin - 273.15, 3)


def _unix_to_datetime(unix_timestamp: int) -> datetime:
    return datetime.fromtimestamp(unix_timestamp, tz=UTC)


@lru_cache
def _get_default_user_id() -> int:
    sql = text("SELECT id FROM public.usuarios WHERE email = :email LIMIT 1")
    with engine.connect() as connection:
        user_id = connection.execute(sql, {"email": settings.default_user_email}).scalar_one_or_none()

    if user_id is None:
        raise RuntimeError(f"Default user not found for email: {settings.default_user_email}")

    return int(user_id)


def _resolve_user_id(user_id: int | None) -> int:
    return int(user_id) if user_id is not None else _get_default_user_id()


def _extract_polygon_metadata(polygon_data: dict[str, Any] | None) -> dict[str, Any]:
    if not polygon_data:
        return {
            "polygon_id": None,
            "polygon_geojson": None,
            "polygon_center_latitude": None,
            "polygon_center_longitude": None,
            "polygon_area": None,
        }

    center = polygon_data.get("center")
    center_lon = None
    center_lat = None
    if isinstance(center, list) and len(center) >= 2:
        if isinstance(center[0], (int, float)) and isinstance(center[1], (int, float)):
            center_lon = float(center[0])
            center_lat = float(center[1])

    return {
        "polygon_id": polygon_data.get("id"),
        "polygon_geojson": json.dumps(polygon_data.get("geo_json")) if polygon_data.get("geo_json") else None,
        "polygon_center_latitude": center_lat,
        "polygon_center_longitude": center_lon,
        "polygon_area": polygon_data.get("area"),
    }


def upsert_weather_analysis(
    *,
    latitude: float,
    longitude: float,
    weather_data: dict[str, Any],
    user_id: int | None = None,
) -> None:
    resolved_user_id = _resolve_user_id(user_id)
    main_data = weather_data.get("main", {}) if isinstance(weather_data.get("main"), dict) else {}
    wind_data = weather_data.get("wind", {}) if isinstance(weather_data.get("wind"), dict) else {}
    clouds_data = weather_data.get("clouds", {}) if isinstance(weather_data.get("clouds"), dict) else {}

    observed_at = _unix_to_datetime(int(weather_data.get("dt", int(datetime.now(tz=UTC).timestamp()))))
    temp = float(main_data["temp"]) if isinstance(main_data.get("temp"), (int, float)) else None
    feels_like = float(main_data["feels_like"]) if isinstance(main_data.get("feels_like"), (int, float)) else None
    temp_min = float(main_data["temp_min"]) if isinstance(main_data.get("temp_min"), (int, float)) else None
    temp_max = float(main_data["temp_max"]) if isinstance(main_data.get("temp_max"), (int, float)) else None

    sql = text(
        """
        INSERT INTO public.farm_monitoring_records (
            user_id,
            latitude, longitude, observed_at,
            weather_temp_kelvin, weather_temp_celsius,
            weather_feels_like_kelvin, weather_feels_like_celsius,
            weather_temp_min_kelvin, weather_temp_min_celsius,
            weather_temp_max_kelvin, weather_temp_max_celsius,
            weather_humidity_percent, weather_pressure_hpa,
            wind_speed_mps, wind_direction_deg, cloudiness_percent,
            payload, updated_at
        ) VALUES (
            :user_id,
            :latitude, :longitude, :observed_at,
            :weather_temp_kelvin, :weather_temp_celsius,
            :weather_feels_like_kelvin, :weather_feels_like_celsius,
            :weather_temp_min_kelvin, :weather_temp_min_celsius,
            :weather_temp_max_kelvin, :weather_temp_max_celsius,
            :weather_humidity_percent, :weather_pressure_hpa,
            :wind_speed_mps, :wind_direction_deg, :cloudiness_percent,
            CAST(:payload AS jsonb), NOW()
        )
        ON CONFLICT (user_id, latitude, longitude, observed_at, data_provider)
        DO UPDATE SET
            weather_temp_kelvin = EXCLUDED.weather_temp_kelvin,
            weather_temp_celsius = EXCLUDED.weather_temp_celsius,
            weather_feels_like_kelvin = EXCLUDED.weather_feels_like_kelvin,
            weather_feels_like_celsius = EXCLUDED.weather_feels_like_celsius,
            weather_temp_min_kelvin = EXCLUDED.weather_temp_min_kelvin,
            weather_temp_min_celsius = EXCLUDED.weather_temp_min_celsius,
            weather_temp_max_kelvin = EXCLUDED.weather_temp_max_kelvin,
            weather_temp_max_celsius = EXCLUDED.weather_temp_max_celsius,
            weather_humidity_percent = EXCLUDED.weather_humidity_percent,
            weather_pressure_hpa = EXCLUDED.weather_pressure_hpa,
            wind_speed_mps = EXCLUDED.wind_speed_mps,
            wind_direction_deg = EXCLUDED.wind_direction_deg,
            cloudiness_percent = EXCLUDED.cloudiness_percent,
            payload = EXCLUDED.payload,
            updated_at = NOW()
        """
    )

    params = {
        "user_id": resolved_user_id,
        "latitude": latitude,
        "longitude": longitude,
        "observed_at": observed_at,
        "weather_temp_kelvin": temp,
        "weather_temp_celsius": _kelvin_to_celsius(temp) if temp is not None else None,
        "weather_feels_like_kelvin": feels_like,
        "weather_feels_like_celsius": _kelvin_to_celsius(feels_like) if feels_like is not None else None,
        "weather_temp_min_kelvin": temp_min,
        "weather_temp_min_celsius": _kelvin_to_celsius(temp_min) if temp_min is not None else None,
        "weather_temp_max_kelvin": temp_max,
        "weather_temp_max_celsius": _kelvin_to_celsius(temp_max) if temp_max is not None else None,
        "weather_humidity_percent": main_data.get("humidity"),
        "weather_pressure_hpa": main_data.get("pressure"),
        "wind_speed_mps": wind_data.get("speed"),
        "wind_direction_deg": wind_data.get("deg"),
        "cloudiness_percent": clouds_data.get("all"),
        "payload": json.dumps(weather_data),
    }

    with engine.begin() as connection:
        connection.execute(sql, params)


def upsert_soil_analysis(
    *,
    latitude: float,
    longitude: float,
    soil_data: dict[str, Any],
    user_id: int | None = None,
) -> None:
    resolved_user_id = _resolve_user_id(user_id)
    observed_at = _unix_to_datetime(int(soil_data.get("dt", int(datetime.now(tz=UTC).timestamp()))))
    t0 = float(soil_data["t0"]) if isinstance(soil_data.get("t0"), (int, float)) else None
    t10 = float(soil_data["t10"]) if isinstance(soil_data.get("t10"), (int, float)) else None

    sql = text(
        """
        INSERT INTO public.farm_monitoring_records (
            user_id,
            latitude, longitude, observed_at,
            soil_moisture, soil_temp_surface_kelvin, soil_temp_surface_celsius,
            soil_temp_10cm_kelvin, soil_temp_10cm_celsius,
            payload, updated_at
        ) VALUES (
            :user_id,
            :latitude, :longitude, :observed_at,
            :soil_moisture, :soil_temp_surface_kelvin, :soil_temp_surface_celsius,
            :soil_temp_10cm_kelvin, :soil_temp_10cm_celsius,
            CAST(:payload AS jsonb), NOW()
        )
        ON CONFLICT (user_id, latitude, longitude, observed_at, data_provider)
        DO UPDATE SET
            soil_moisture = EXCLUDED.soil_moisture,
            soil_temp_surface_kelvin = EXCLUDED.soil_temp_surface_kelvin,
            soil_temp_surface_celsius = EXCLUDED.soil_temp_surface_celsius,
            soil_temp_10cm_kelvin = EXCLUDED.soil_temp_10cm_kelvin,
            soil_temp_10cm_celsius = EXCLUDED.soil_temp_10cm_celsius,
            payload = EXCLUDED.payload,
            updated_at = NOW()
        """
    )

    params = {
        "user_id": resolved_user_id,
        "latitude": latitude,
        "longitude": longitude,
        "observed_at": observed_at,
        "soil_moisture": soil_data.get("moisture"),
        "soil_temp_surface_kelvin": t0,
        "soil_temp_surface_celsius": _kelvin_to_celsius(t0) if t0 is not None else None,
        "soil_temp_10cm_kelvin": t10,
        "soil_temp_10cm_celsius": _kelvin_to_celsius(t10) if t10 is not None else None,
        "payload": json.dumps(soil_data),
    }

    with engine.begin() as connection:
        connection.execute(sql, params)


def upsert_satellite_analysis(
    *,
    latitude: float,
    longitude: float,
    satellite_data: list[dict[str, Any]],
    analysis_kind: str,
    polygon_data: dict[str, Any] | None = None,
    user_id: int | None = None,
) -> None:
    if not satellite_data:
        return

    latest = max(
        satellite_data,
        key=lambda item: int(item.get("dt", 0)) if isinstance(item.get("dt"), int) else 0,
    )
    observed_at = _unix_to_datetime(int(latest.get("dt", int(datetime.now(tz=UTC).timestamp()))))

    polygon_metadata = _extract_polygon_metadata(polygon_data)
    resolved_user_id = _resolve_user_id(user_id)

    sql = text(
        """
        INSERT INTO public.farm_monitoring_records (
            user_id,
            latitude, longitude, observed_at,
            satellite_source, vegetation_stats, payload,
            polygon_id, polygon_geojson, polygon_center_latitude, polygon_center_longitude, polygon_area,
            updated_at
        ) VALUES (
            :user_id,
            :latitude, :longitude, :observed_at,
            :satellite_source, CAST(:vegetation_stats AS jsonb), CAST(:payload AS jsonb),
            :polygon_id, CAST(:polygon_geojson AS jsonb), :polygon_center_latitude, :polygon_center_longitude, :polygon_area,
            NOW()
        )
        ON CONFLICT (user_id, latitude, longitude, observed_at, data_provider)
        DO UPDATE SET
            satellite_source = EXCLUDED.satellite_source,
            vegetation_stats = EXCLUDED.vegetation_stats,
            payload = EXCLUDED.payload,
            polygon_id = EXCLUDED.polygon_id,
            polygon_geojson = EXCLUDED.polygon_geojson,
            polygon_center_latitude = EXCLUDED.polygon_center_latitude,
            polygon_center_longitude = EXCLUDED.polygon_center_longitude,
            polygon_area = EXCLUDED.polygon_area,
            updated_at = NOW()
        """
    )

    vegetation_stats = latest.get("stats", {})
    payload = {
        "analysis_kind": analysis_kind,
        "items_count": len(satellite_data),
        "latest": latest,
    }

    with engine.begin() as connection:
        connection.execute(
            sql,
            {
                "latitude": latitude,
                "user_id": resolved_user_id,
                "longitude": longitude,
                "observed_at": observed_at,
                "satellite_source": latest.get("type"),
                "vegetation_stats": json.dumps(vegetation_stats),
                "payload": json.dumps(payload),
                "polygon_id": polygon_metadata["polygon_id"],
                "polygon_geojson": polygon_metadata["polygon_geojson"],
                "polygon_center_latitude": polygon_metadata["polygon_center_latitude"],
                "polygon_center_longitude": polygon_metadata["polygon_center_longitude"],
                "polygon_area": polygon_metadata["polygon_area"],
            },
        )


def upsert_polygon_shape(
    *,
    latitude: float,
    longitude: float,
    polygon_data: dict[str, Any],
    user_id: int | None = None,
) -> None:
    polygon_metadata = _extract_polygon_metadata(polygon_data)
    observed_at = datetime.now(tz=UTC)
    resolved_user_id = _resolve_user_id(user_id)

    sql = text(
        """
        INSERT INTO public.farm_monitoring_records (
            user_id,
            latitude, longitude, observed_at,
            polygon_id, polygon_geojson, polygon_center_latitude, polygon_center_longitude, polygon_area,
            payload, updated_at
        ) VALUES (
            :user_id,
            :latitude, :longitude, :observed_at,
            :polygon_id, CAST(:polygon_geojson AS jsonb), :polygon_center_latitude, :polygon_center_longitude, :polygon_area,
            CAST(:payload AS jsonb), NOW()
        )
        ON CONFLICT (user_id, latitude, longitude, observed_at, data_provider)
        DO UPDATE SET
            polygon_id = EXCLUDED.polygon_id,
            polygon_geojson = EXCLUDED.polygon_geojson,
            polygon_center_latitude = EXCLUDED.polygon_center_latitude,
            polygon_center_longitude = EXCLUDED.polygon_center_longitude,
            polygon_area = EXCLUDED.polygon_area,
            payload = EXCLUDED.payload,
            updated_at = NOW()
        """
    )

    with engine.begin() as connection:
        connection.execute(
            sql,
            {
                "latitude": latitude,
                "user_id": resolved_user_id,
                "longitude": longitude,
                "observed_at": observed_at,
                "polygon_id": polygon_metadata["polygon_id"],
                "polygon_geojson": polygon_metadata["polygon_geojson"],
                "polygon_center_latitude": polygon_metadata["polygon_center_latitude"],
                "polygon_center_longitude": polygon_metadata["polygon_center_longitude"],
                "polygon_area": polygon_metadata["polygon_area"],
                "payload": json.dumps({"analysis_kind": "polygon_shape", "polygon": polygon_data}),
            },
        )


def add_coordinate(
    *,
    name: str,
    latitude: float,
    longitude: float,
    polygon_id: str | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    resolved_user_id = _resolve_user_id(user_id)
    sql = text(
        """
        INSERT INTO public.farm_coordinates (user_id, name, latitude, longitude, polygon_id, updated_at)
        VALUES (:user_id, :name, :latitude, :longitude, :polygon_id, NOW())
        RETURNING id, user_id, name, latitude, longitude, polygon_id, created_at, updated_at
        """
    )
    with engine.begin() as connection:
        row = connection.execute(
            sql,
            {
                "user_id": resolved_user_id,
                "name": name,
                "latitude": latitude,
                "longitude": longitude,
                "polygon_id": polygon_id,
            },
        ).mappings().one()
    return dict(row)


def list_coordinates() -> list[dict[str, Any]]:
    sql = text(
        """
        SELECT id, user_id, name, latitude, longitude, polygon_id, created_at, updated_at
        FROM public.farm_coordinates
        ORDER BY id ASC
        """
    )
    with engine.connect() as connection:
        rows = connection.execute(sql).mappings().all()
    return [dict(row) for row in rows]


def get_latest_farm_identity(*, user_id: int | None = None) -> dict[str, Any] | None:
    resolved_user_id = _resolve_user_id(user_id)
    sql = text(
        """
        SELECT farm_name, farm_location, latitude, longitude, observed_at
        FROM public.farm_monitoring_records
        WHERE user_id = :user_id
        ORDER BY observed_at DESC, id DESC
        LIMIT 1
        """
    )
    with engine.connect() as connection:
        row = connection.execute(sql, {"user_id": resolved_user_id}).mappings().one_or_none()

    if not row:
        return None

    return {
        "farm_name": row["farm_name"],
        "farm_location": row["farm_location"],
        "latitude": float(row["latitude"]) if row["latitude"] is not None else None,
        "longitude": float(row["longitude"]) if row["longitude"] is not None else None,
        "observed_at": row["observed_at"],
    }


def update_coordinate(
    *,
    coordinate_id: int,
    name: str,
    latitude: float,
    longitude: float,
    polygon_id: str | None = None,
    user_id: int | None = None,
) -> dict[str, Any] | None:
    resolved_user_id = _resolve_user_id(user_id)
    sql = text(
        """
        UPDATE public.farm_coordinates
        SET user_id = :user_id,
            name = :name,
            latitude = :latitude,
            longitude = :longitude,
            polygon_id = COALESCE(:polygon_id, polygon_id),
            updated_at = NOW()
        WHERE id = :coordinate_id
        RETURNING id, user_id, name, latitude, longitude, polygon_id, created_at, updated_at
        """
    )
    with engine.begin() as connection:
        row = connection.execute(
            sql,
            {
                "coordinate_id": coordinate_id,
                "user_id": resolved_user_id,
                "name": name,
                "latitude": latitude,
                "longitude": longitude,
                "polygon_id": polygon_id,
            },
        ).mappings().one_or_none()
    return dict(row) if row else None


def delete_coordinate(*, coordinate_id: int) -> bool:
    sql = text("DELETE FROM public.farm_coordinates WHERE id = :coordinate_id")
    with engine.begin() as connection:
        result = connection.execute(sql, {"coordinate_id": coordinate_id})
    return result.rowcount > 0
