from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings

settings = get_settings()
DEFAULT_WEBHOOK_EVENTS_URL = "https://webhook.arrtechsolucoes.com.br/webhook/175f5c34-0059-4e36-b60d-f2b108a487c7"
MAX_WEBHOOK_ATTEMPTS = 3


def _build_payload(envio_de: str) -> dict[str, Any]:
    return {"envio_de": envio_de}


def _resolve_webhook_url() -> str:
    configured = str(settings.webhook_events_url or "").strip()
    return configured or DEFAULT_WEBHOOK_EVENTS_URL


def notify_map_updated() -> bool:
    return _notify_sync(_build_payload("mapa atualizado"))


def notify_insight_generated() -> bool:
    return _notify_sync(_build_payload("insight gerado"))


async def notify_insight_generated_async() -> bool:
    return await _notify_async(_build_payload("insight gerado"))


def _notify_sync(payload: dict[str, Any]) -> bool:
    webhook_url = _resolve_webhook_url()
    for _ in range(MAX_WEBHOOK_ATTEMPTS):
        try:
            with httpx.Client(timeout=settings.webhook_timeout_seconds) as client:
                response = client.post(webhook_url, json=payload)
                response.raise_for_status()
            return True
        except httpx.HTTPError:
            continue
    return False


async def _notify_async(payload: dict[str, Any]) -> bool:
    webhook_url = _resolve_webhook_url()
    for _ in range(MAX_WEBHOOK_ATTEMPTS):
        try:
            async with httpx.AsyncClient(timeout=settings.webhook_timeout_seconds) as client:
                response = await client.post(webhook_url, json=payload)
                response.raise_for_status()
            return True
        except httpx.HTTPError:
            continue
    return False
