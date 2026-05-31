from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.integrations.agromonitoring import AgroMonitoringClient
from app.services.farm_monitoring import (
    add_coordinate,
    delete_coordinate,
    get_latest_farm_identity,
    list_coordinates,
    update_coordinate,
    upsert_polygon_shape,
    upsert_satellite_analysis,
    upsert_soil_analysis,
    upsert_weather_analysis,
)

router = APIRouter(prefix="/farm-monitoring", tags=["farm-monitoring"])
client = AgroMonitoringClient()
settings = get_settings()
DEFAULT_POLYGON_ID = "6a1aec4cb5c0520008ea2893"


class CoordinatePayload(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)


async def _sync_polygon_after_coordinate_change(
    *,
    latitude: float,
    longitude: float,
    polygon_id: str | None,
) -> dict[str, Any]:
    request_polygon_id = polygon_id if isinstance(polygon_id, str) else ""
    configured_polygon_id = (
        settings.agromonitoring_farm_polygon_id
        if isinstance(settings.agromonitoring_farm_polygon_id, str)
        else ""
    )

    resolved_polygon_id = (
        request_polygon_id
        or configured_polygon_id
        or DEFAULT_POLYGON_ID
    ).strip()
    if not resolved_polygon_id:
        return {
            "synced": False,
            "reason": "polygonId not provided and AGROMONITORING_FARM_POLYGON_ID is empty",
        }

    polygon_data = await client.get_polygon(resolved_polygon_id)
    upsert_polygon_shape(latitude=latitude, longitude=longitude, polygon_data=polygon_data)
    return {"synced": True, "polygon_id": resolved_polygon_id}


@router.put("/weather")
async def put_weather_analysis(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> dict[str, Any]:
    weather_data = await client.get_weather(lat=latitude, lon=longitude)
    upsert_weather_analysis(latitude=latitude, longitude=longitude, weather_data=weather_data)
    return {"status": "updated", "analysis": "weather", "latitude": latitude, "longitude": longitude}


@router.put("/soil")
async def put_soil_analysis(
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> dict[str, Any]:
    soil_data = await client.get_soil(lat=latitude, lon=longitude)
    upsert_soil_analysis(latitude=latitude, longitude=longitude, soil_data=soil_data)
    return {"status": "updated", "analysis": "soil", "latitude": latitude, "longitude": longitude}


@router.put("/satellite/history")
async def put_satellite_history_analysis(
    polygon_id: str = Query(..., alias="polygonId"),
    start_unix: int = Query(..., alias="start"),
    end_unix: int = Query(..., alias="end"),
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> dict[str, Any]:
    polygon_data = await client.get_polygon(polygon_id)
    history_data = await client.get_satellite_history(
        polygon_id=polygon_id,
        start_unix=start_unix,
        end_unix=end_unix,
    )
    upsert_satellite_analysis(
        latitude=latitude,
        longitude=longitude,
        satellite_data=history_data,
        analysis_kind="satellite_history",
        polygon_data=polygon_data,
    )
    return {"status": "updated", "analysis": "satellite_history", "items": len(history_data)}


@router.put("/vegetation/indices")
async def put_vegetation_indices_analysis(
    polygon_id: str = Query(..., alias="polygonId"),
    start_unix: int = Query(..., alias="start"),
    end_unix: int = Query(..., alias="end"),
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> dict[str, Any]:
    polygon_data = await client.get_polygon(polygon_id)
    indices_data = await client.get_satellite_history(
        polygon_id=polygon_id,
        start_unix=start_unix,
        end_unix=end_unix,
    )
    upsert_satellite_analysis(
        latitude=latitude,
        longitude=longitude,
        satellite_data=indices_data,
        analysis_kind="vegetation_indices",
        polygon_data=polygon_data,
    )
    return {"status": "updated", "analysis": "vegetation_indices", "items": len(indices_data)}


@router.put("/polygon")
async def put_polygon_shape(
    polygon_id: str = Query(..., alias="polygonId"),
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
) -> dict[str, Any]:
    polygon_data = await client.get_polygon(polygon_id)
    upsert_polygon_shape(latitude=latitude, longitude=longitude, polygon_data=polygon_data)
    return {"status": "updated", "analysis": "polygon_shape", "polygon_id": polygon_id}


@router.get("/coordinates")
def get_coordinates() -> list[dict[str, Any]]:
    return list_coordinates()


@router.get("/latest")
def get_latest_farm_monitoring_identity() -> dict[str, Any]:
    latest = get_latest_farm_identity()
    if not latest:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No farm monitoring data found")
    return latest


@router.post("/coordinates", status_code=status.HTTP_201_CREATED)
async def post_coordinate(
    payload: CoordinatePayload,
    polygon_id: str | None = Query(None, alias="polygonId"),
) -> dict[str, Any]:
    coordinate = add_coordinate(name=payload.name, latitude=payload.latitude, longitude=payload.longitude)
    polygon_sync = await _sync_polygon_after_coordinate_change(
        latitude=payload.latitude,
        longitude=payload.longitude,
        polygon_id=polygon_id,
    )
    return {"coordinate": coordinate, "polygon_sync": polygon_sync}


@router.put("/coordinates/{coordinate_id}")
async def put_coordinate(
    coordinate_id: int,
    payload: CoordinatePayload,
    polygon_id: str | None = Query(None, alias="polygonId"),
) -> dict[str, Any]:
    updated = update_coordinate(
        coordinate_id=coordinate_id,
        name=payload.name,
        latitude=payload.latitude,
        longitude=payload.longitude,
    )
    if not updated:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordinate not found")
    polygon_sync = await _sync_polygon_after_coordinate_change(
        latitude=payload.latitude,
        longitude=payload.longitude,
        polygon_id=polygon_id,
    )
    return {"coordinate": updated, "polygon_sync": polygon_sync}


@router.delete("/coordinates/{coordinate_id}")
def remove_coordinate(coordinate_id: int) -> dict[str, Any]:
    deleted = delete_coordinate(coordinate_id=coordinate_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Coordinate not found")
    return {"status": "deleted", "coordinate_id": coordinate_id}
