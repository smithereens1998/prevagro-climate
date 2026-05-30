from functools import lru_cache
import os
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"


def _bootstrap_env_file() -> None:
    if not ENV_FILE_PATH.exists():
        return

    text_content: str | None = None
    for encoding in ("utf-8", "utf-16", "utf-16-le", "utf-16-be"):
        try:
            text_content = ENV_FILE_PATH.read_text(encoding=encoding)
            if "=" in text_content:
                break
        except UnicodeError:
            continue

    if not text_content:
        return

    for line in text_content.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key, value = stripped.split("=", 1)
        key = key.strip()
        value = value.strip().strip("\"").strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


_bootstrap_env_file()


class Settings(BaseSettings):
    database_url: str
    default_user_email: str = "prevagro@gmail.com"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-pro"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    agromonitoring_api_key: str = ""
    agromonitoring_base_url: str = "https://api.agromonitoring.com/agro/1.0"
    agromonitoring_timeout_seconds: float = 20.0
    agromonitoring_farm_polygon_id: str = ""
    agromonitoring_farm_name: str = "Data Coffe"
    seasonal_forecast_base_url: str = "https://climate-api.open-meteo.com/v1/climate"
    seasonal_forecast_model: str = "MRI_AGCM3_2_S"
    seasonal_forecast_timezone: str = "UTC"

    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE_PATH),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
