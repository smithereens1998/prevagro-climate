from __future__ import annotations

import json
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import get_settings


class GeminiClient:
    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = settings.gemini_api_key
        self.model = settings.gemini_model
        self.base_url = settings.gemini_base_url.rstrip("/")
        self.fallback_models = [self.model, "gemini-2.5-pro", "gemini-2.5-flash"]

    async def generate_structured_analysis(self, *, prompt: str) -> dict[str, Any]:
        if not self.api_key:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="GEMINI_API_KEY is not configured",
            )

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseMimeType": "application/json",
                "temperature": 0.3,
            },
        }
        params = {"key": self.api_key}

        unique_models = list(dict.fromkeys(self.fallback_models))
        data: dict[str, Any] | None = None
        last_error: httpx.HTTPStatusError | httpx.HTTPError | None = None

        for model_name in unique_models:
            url = f"{self.base_url}/models/{model_name}:generateContent"
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.post(url, params=params, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    break
            except httpx.HTTPStatusError as error:
                last_error = error
                if error.response.status_code == 404:
                    continue
                raise HTTPException(
                    status_code=error.response.status_code,
                    detail=error.response.text,
                ) from error
            except httpx.HTTPError as error:
                last_error = error
                continue

        if data is None:
            if isinstance(last_error, httpx.HTTPStatusError):
                raise HTTPException(
                    status_code=last_error.response.status_code,
                    detail=last_error.response.text,
                ) from last_error
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini unavailable: {last_error}",
            )

        text_output = _extract_text_output(data)
        try:
            return json.loads(text_output)
        except json.JSONDecodeError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Gemini response was not valid JSON",
            ) from None


def _extract_text_output(response_data: dict[str, Any]) -> str:
    candidates = response_data.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini response had no candidates",
        )

    first = candidates[0]
    content = first.get("content")
    if not isinstance(content, dict):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini response had no content",
        )

    parts = content.get("parts")
    if not isinstance(parts, list) or not parts:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini response had no parts",
        )

    text_part = parts[0].get("text")
    if not isinstance(text_part, str):
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Gemini response text missing",
        )

    return text_part
