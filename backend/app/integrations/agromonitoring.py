from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings


class AgroMonitoringClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.agromonitoring_api_key
        self.base_url = settings.agromonitoring_base_url.rstrip("/")
        self.timeout = settings.agromonitoring_timeout_seconds

    async def _request(self, path: str, params: dict[str, Any]) -> Any:
        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="AGROMONITORING_API_KEY is not configured",
            )

        request_params = {**params, "appid": self.api_key}
        url = f"{self.base_url}/{path.lstrip('/')}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=request_params)
                response.raise_for_status()
                return response.json()
        except httpx.HTTPStatusError as error:
            raise HTTPException(
                status_code=error.response.status_code,
                detail=error.response.text,
            ) from error
        except httpx.HTTPError as error:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AgroMonitoring unavailable: {error}",
            ) from error

    async def list_polygons(self) -> list[dict[str, Any]]:
        data = await self._request("/polygons", {})
        return data if isinstance(data, list) else [data]

    async def get_polygon(self, polygon_id: str) -> dict[str, Any]:
        return await self._request(f"/polygons/{polygon_id}", {})

    async def get_weather(self, *, lat: float, lon: float) -> dict[str, Any]:
        return await self._request("/weather", {"lat": lat, "lon": lon})

    async def get_soil(self, *, lat: float, lon: float) -> dict[str, Any]:
        return await self._request("/soil", {"lat": lat, "lon": lon})

    async def get_satellite_history(
        self,
        *,
        polygon_id: str,
        start_unix: int,
        end_unix: int,
    ) -> list[dict[str, Any]]:
        data = await self._request(
            "/image/search",
            {"polyid": polygon_id, "start": start_unix, "end": end_unix},
        )
        return data if isinstance(data, list) else [data]
