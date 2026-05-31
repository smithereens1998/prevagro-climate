from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine

DEFAULT_LATITUDE = -18.9439
DEFAULT_LONGITUDE = -46.9925


def normalize_coordinate_pair(latitude: float, longitude: float) -> tuple[float, float]:
    lat = float(latitude)
    lon = float(longitude)
    # Cadastro comum no Brasil: lat/lon positivos quando deveriam ser negativos.
    if lat > 0 and lon > 0 and 5.0 <= lat <= 35.0 and 30.0 <= lon <= 75.0:
        return -abs(lat), -abs(lon)
    return lat, lon


def resolve_effective_coordinate(
    *,
    user_id: int,
    latitude: float | None = None,
    longitude: float | None = None,
) -> tuple[float, float]:
    if latitude is not None and longitude is not None:
        return normalize_coordinate_pair(latitude, longitude)

    monitoring_sql = text(
        """
        SELECT
            COALESCE(polygon_center_latitude, latitude) AS latitude,
            COALESCE(polygon_center_longitude, longitude) AS longitude
        FROM public.farm_monitoring_records
        WHERE user_id = :user_id
        ORDER BY observed_at DESC, id DESC
        LIMIT 1
        """
    )
    coordinate_sql = text(
        """
        SELECT latitude, longitude
        FROM public.farm_coordinates
        WHERE user_id = :user_id
        ORDER BY updated_at DESC
        LIMIT 1
        """
    )

    with engine.connect() as connection:
        monitoring_row = connection.execute(monitoring_sql, {"user_id": user_id}).mappings().one_or_none()
        if monitoring_row and monitoring_row["latitude"] is not None and monitoring_row["longitude"] is not None:
            return normalize_coordinate_pair(
                float(monitoring_row["latitude"]),
                float(monitoring_row["longitude"]),
            )

        coordinate_row = connection.execute(coordinate_sql, {"user_id": user_id}).mappings().one_or_none()
        if coordinate_row:
            return normalize_coordinate_pair(
                float(coordinate_row["latitude"]),
                float(coordinate_row["longitude"]),
            )

    return DEFAULT_LATITUDE, DEFAULT_LONGITUDE
