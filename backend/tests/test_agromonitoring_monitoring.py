import asyncio
import json
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest

from app.core.config import get_settings
from app.integrations.agromonitoring import AgroMonitoringClient

DATA_COFFE_LAT = -18.9439
DATA_COFFE_LON = -46.9925


def _kelvin_to_celsius(temperature_kelvin: float) -> float:
    return round(temperature_kelvin - 273.15, 2)


def _extract_polygon_id(polygon: dict[str, Any]) -> str | None:
    polygon_id = polygon.get("id")
    return str(polygon_id) if polygon_id else None


def _extract_polygon_name(polygon: dict[str, Any]) -> str:
    raw_name = polygon.get("name") or polygon.get("title") or ""
    return str(raw_name).strip()


def _extract_lat_lon(polygon: dict[str, Any]) -> tuple[float | None, float | None]:
    center = polygon.get("center")
    if isinstance(center, list) and len(center) >= 2:
        lon, lat = center[0], center[1]
        if isinstance(lat, (int, float)) and isinstance(lon, (int, float)):
            return float(lat), float(lon)

    geo_json = polygon.get("geo_json")
    geometry = geo_json.get("geometry") if isinstance(geo_json, dict) else None
    coordinates = geometry.get("coordinates") if isinstance(geometry, dict) else None
    if not isinstance(coordinates, list) or not coordinates:
        return None, None

    ring = coordinates[0]
    if not isinstance(ring, list) or not ring:
        return None, None

    point = ring[0]
    if (
        isinstance(point, list)
        and len(point) >= 2
        and isinstance(point[0], (int, float))
        and isinstance(point[1], (int, float))
    ):
        lon, lat = point[0], point[1]
        return float(lat), float(lon)

    return None, None


def _select_data_coffe_polygon(polygons: list[dict[str, Any]]) -> dict[str, Any] | None:
    settings = get_settings()
    configured_polygon_id = settings.agromonitoring_farm_polygon_id.strip()
    configured_farm_name = settings.agromonitoring_farm_name.strip().lower()

    if configured_polygon_id:
        for polygon in polygons:
            polygon_id = _extract_polygon_id(polygon)
            if polygon_id == configured_polygon_id:
                return polygon
        return None

    normalized_targets = tuple(
        target
        for target in (
            configured_farm_name,
            "data coffe",
            "data coffee",
            "fazenda data coffe",
        )
        if target
    )

    for polygon in polygons:
        name = _extract_polygon_name(polygon).lower()
        if any(target in name for target in normalized_targets):
            return polygon

    return None


def _get_time_window() -> tuple[int, int]:
    end = datetime.now(tz=UTC)
    start = end - timedelta(days=30)
    return int(start.timestamp()), int(end.timestamp())


def _require_configured_api_key() -> None:
    settings = get_settings()
    if not settings.agromonitoring_api_key:
        pytest.skip("AGROMONITORING_API_KEY not configured in .env")


def _resolve_farm_context() -> tuple[AgroMonitoringClient, dict[str, Any], str, float, float]:
    client = AgroMonitoringClient()
    polygons = asyncio.run(client.list_polygons())
    if not polygons:
        pytest.skip("No polygons found in AgroMonitoring account")

    polygon = _select_data_coffe_polygon(polygons)
    if not polygon:
        available_names = ", ".join(_extract_polygon_name(item) for item in polygons)
        pytest.skip(
            "Farm polygon not found. Set AGROMONITORING_FARM_POLYGON_ID in .env "
            f"or AGROMONITORING_FARM_NAME. Available polygons: {available_names}"
        )

    polygon_id = _extract_polygon_id(polygon)
    if not polygon_id:
        pytest.skip("Selected polygon has no id")

    lat, lon = _extract_lat_lon(polygon)
    if lat is None or lon is None:
        pytest.skip("Selected polygon has no valid coordinates")

    return client, polygon, polygon_id, lat, lon


def test_fetch_weather_data_data_coffe() -> None:
    _require_configured_api_key()
    client = AgroMonitoringClient()

    weather_data = asyncio.run(client.get_weather(lat=DATA_COFFE_LAT, lon=DATA_COFFE_LON))

    print("\n=== AgroMonitoring Weather (Data Coffe) ===")
    print(f"latitude={DATA_COFFE_LAT} longitude={DATA_COFFE_LON}")
    main_data = weather_data.get("main")
    if isinstance(main_data, dict):
        for field in ("temp", "feels_like", "temp_min", "temp_max"):
            value = main_data.get(field)
            if isinstance(value, (int, float)):
                celsius_value = _kelvin_to_celsius(float(value))
                print(f"{field}_celsius={celsius_value}C")
    print(json.dumps(weather_data, indent=2, ensure_ascii=False))

    assert isinstance(weather_data, dict)
    assert weather_data


def test_fetch_satellite_history_data_coffe() -> None:
    _require_configured_api_key()
    client, polygon, polygon_id, _, _ = _resolve_farm_context()
    start_unix, end_unix = _get_time_window()

    history_data = asyncio.run(
        client.get_satellite_history(
            polygon_id=polygon_id,
            start_unix=start_unix,
            end_unix=end_unix,
        )
    )

    print("\n=== AgroMonitoring Satellite History (Data Coffe) ===")
    print(f"polygon_id={polygon_id} name={_extract_polygon_name(polygon)}")
    print(f"start={start_unix} end={end_unix}")
    print(f"items={len(history_data)}")
    print(json.dumps(history_data[:3], indent=2, ensure_ascii=False))

    assert isinstance(history_data, list)


def test_fetch_vegetation_indices_data_coffe() -> None:
    _require_configured_api_key()
    client, polygon, polygon_id, _, _ = _resolve_farm_context()
    start_unix, end_unix = _get_time_window()

    vegetation_indices_data = asyncio.run(
        client.get_satellite_history(
            polygon_id=polygon_id,
            start_unix=start_unix,
            end_unix=end_unix,
        )
    )

    print("\n=== AgroMonitoring Vegetation Indices (Data Coffe) ===")
    print(f"polygon_id={polygon_id} name={_extract_polygon_name(polygon)}")
    print(f"start={start_unix} end={end_unix}")
    print(f"items={len(vegetation_indices_data)}")
    print(json.dumps(vegetation_indices_data[:3], indent=2, ensure_ascii=False))

    assert isinstance(vegetation_indices_data, list)
