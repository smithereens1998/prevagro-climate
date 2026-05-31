from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings

settings = get_settings()


def _build_payload(envio_de: str) -> dict[str, Any]:
    return {"envio_de": envio_de}


def notify_map_updated() -> bool:
    return _notify_sync(_build_payload("mapa atualizado"))


def notify_insight_generated() -> bool:
    return _notify_sync(_build_payload("insight gerado"))


async def notify_insight_generated_async() -> bool:
    return await _notify_async(_build_payload("insight gerado"))


def _notify_sync(payload: dict[str, Any]) -> bool:
    try:
        with httpx.Client(timeout=settings.webhook_timeout_seconds) as client:
            response = client.post(settings.webhook_events_url, json=payload)
            response.raise_for_status()
        return True
    except httpx.HTTPError:
        return False


async def _notify_async(payload: dict[str, Any]) -> bool:
    try:
        async with httpx.AsyncClient(timeout=settings.webhook_timeout_seconds) as client:
            response = await client.post(settings.webhook_events_url, json=payload)
            response.raise_for_status()
        return True
    except httpx.HTTPError:
        return False
