from __future__ import annotations

from datetime import date
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings


class SeasonalForecastClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.base_url = settings.seasonal_forecast_base_url
        self.model = settings.seasonal_forecast_model
        self.timezone = settings.seasonal_forecast_timezone

    async def fetch_daily_forecast(
        self,
        *,
        latitude: float,
        longitude: float,
        start_date: date,
        end_date: date,
    ) -> dict[str, Any]:
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "models": self.model,
            "timezone": self.timezone,
            "daily": "temperature_2m_mean,temperature_2m_max,temperature_2m_min,precipitation_sum",
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.get(self.base_url, params=params)
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
                detail=f"Seasonal forecast API unavailable: {error}",
            ) from error
