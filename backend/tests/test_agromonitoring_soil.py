import asyncio
import json

import pytest

from app.core.config import get_settings
from app.integrations.agromonitoring import AgroMonitoringClient

# Fazenda Data Coffe - Patrocinio/MG (aproximacao para integracao inicial)
DATA_COFFE_LAT = -18.9439
DATA_COFFE_LON = -46.9925


def _kelvin_to_celsius(temperature_kelvin: float) -> float:
    return round(temperature_kelvin - 273.15, 2)


def test_fetch_soil_data_data_coffe() -> None:
    settings = get_settings()
    if not settings.agromonitoring_api_key:
        pytest.skip("AGROMONITORING_API_KEY not configured in .env")

    client = AgroMonitoringClient()
    soil_data = asyncio.run(client.get_soil(lat=DATA_COFFE_LAT, lon=DATA_COFFE_LON))

    print("\n=== AgroMonitoring Soil Data (Data Coffe) ===")
    print(f"latitude={DATA_COFFE_LAT} longitude={DATA_COFFE_LON}")
    if isinstance(soil_data.get("t0"), (int, float)) and isinstance(soil_data.get("t10"), (int, float)):
        t0_celsius = _kelvin_to_celsius(float(soil_data["t0"]))
        t10_celsius = _kelvin_to_celsius(float(soil_data["t10"]))
        print(f"t0_celsius={t0_celsius}C t10_celsius={t10_celsius}C")
    print(json.dumps(soil_data, indent=2, ensure_ascii=False))

    assert isinstance(soil_data, dict)
    assert soil_data
