from typing import Any

from fastapi import APIRouter, Query

from app.integrations.agromonitoring import AgroMonitoringClient

router = APIRouter(prefix="/agromonitoring", tags=["agromonitoring"])
client = AgroMonitoringClient()


def _kelvin_to_celsius(temperature_kelvin: float) -> float:
    return round(temperature_kelvin - 273.15, 2)


def _enrich_weather_with_celsius(weather_data: dict[str, Any]) -> dict[str, Any]:
    main_data = weather_data.get("main")
    if not isinstance(main_data, dict):
        return weather_data

    enriched_main = dict(main_data)
    for field in ("temp", "feels_like", "temp_min", "temp_max"):
        raw_value = enriched_main.get(field)
        if isinstance(raw_value, (int, float)):
            enriched_main[f"{field}_celsius"] = _kelvin_to_celsius(float(raw_value))

    enriched_data = dict(weather_data)
    enriched_data["main"] = enriched_main
    return enriched_data


def _enrich_soil_with_celsius(soil_data: dict[str, Any]) -> dict[str, Any]:
    enriched_data = dict(soil_data)
    temperature_celsius: dict[str, float] = {}

    for field in ("t0", "t10"):
        raw_value = soil_data.get(field)
        if isinstance(raw_value, (int, float)):
            temperature_celsius[f"{field}_celsius"] = _kelvin_to_celsius(float(raw_value))

    if temperature_celsius:
        enriched_data["temperature_celsius"] = temperature_celsius

    return enriched_data


@router.get("/polygons")
async def list_farm_polygons() -> list[dict[str, Any]]:
    return await client.list_polygons()


@router.get("/polygons/{polygon_id}")
async def get_farm_polygon(polygon_id: str) -> dict[str, Any]:
    return await client.get_polygon(polygon_id)


@router.get("/weather")
async def get_weather(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
) -> dict[str, Any]:
    weather_data = await client.get_weather(lat=lat, lon=lon)
    return _enrich_weather_with_celsius(weather_data)


@router.get("/soil")
async def get_soil_moisture(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
) -> dict[str, Any]:
    soil_data = await client.get_soil(lat=lat, lon=lon)
    return _enrich_soil_with_celsius(soil_data)


@router.get("/satellite/history")
async def get_temporal_history(
    polygon_id: str = Query(..., alias="polygonId", description="Polygon ID"),
    start_unix: int = Query(..., alias="start", description="Start unix timestamp"),
    end_unix: int = Query(..., alias="end", description="End unix timestamp"),
) -> list[dict[str, Any]]:
    return await client.get_satellite_history(
        polygon_id=polygon_id,
        start_unix=start_unix,
        end_unix=end_unix,
    )


@router.get("/vegetation/indices")
async def get_vegetation_indices(
    polygon_id: str = Query(..., alias="polygonId", description="Polygon ID"),
    start_unix: int = Query(..., alias="start", description="Start unix timestamp"),
    end_unix: int = Query(..., alias="end", description="End unix timestamp"),
) -> list[dict[str, Any]]:
    return await client.get_satellite_history(
        polygon_id=polygon_id,
        start_unix=start_unix,
        end_unix=end_unix,
    )
