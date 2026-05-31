from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import text

from app.core.config import get_settings
from app.db.database import engine
from app.integrations.gemini import GeminiClient
from app.integrations.webhook_notifier import notify_insight_generated_async

settings = get_settings()
PROMPT_VERSION = "v1.1.0"


def _get_default_user_id() -> int:
    sql = text("SELECT id FROM public.usuarios WHERE email = :email LIMIT 1")
    with engine.connect() as connection:
        user_id = connection.execute(sql, {"email": settings.default_user_email}).scalar_one_or_none()
    if user_id is None:
        raise RuntimeError(f"Default user not found: {settings.default_user_email}")
    return int(user_id)


def _serialize_rows(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    serialized: list[dict[str, Any]] = []
    for row in rows:
        data: dict[str, Any] = {}
        for key, value in row.items():
            if isinstance(value, datetime):
                data[key] = value.isoformat()
            elif isinstance(value, date):
                data[key] = value.isoformat()
            elif isinstance(value, Decimal):
                data[key] = float(value)
            else:
                data[key] = value
        serialized.append(data)
    return serialized


def get_recent_monitoring_data(
    *,
    user_id: int | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    limit: int = 20,
) -> list[dict[str, Any]]:
    resolved_user_id = user_id or _get_default_user_id()
    params: dict[str, Any] = {"user_id": resolved_user_id, "limit": limit}

    query = """
        SELECT
            observed_at,
            latitude,
            longitude,
            weather_temp_celsius,
            weather_humidity_percent,
            weather_pressure_hpa,
            wind_speed_mps,
            cloudiness_percent,
            soil_moisture,
            soil_temp_surface_celsius,
            soil_temp_10cm_celsius,
            satellite_source,
            polygon_id,
            polygon_area,
            vegetation_stats,
            payload
        FROM public.farm_monitoring_records
        WHERE user_id = :user_id
    """

    if latitude is not None and longitude is not None:
        query += " AND latitude = :latitude AND longitude = :longitude"
        params["latitude"] = latitude
        params["longitude"] = longitude

    query += " ORDER BY observed_at DESC LIMIT :limit"

    with engine.connect() as connection:
        rows = connection.execute(text(query), params).mappings().all()

    return _serialize_rows([dict(row) for row in rows])


def get_horizon_features(
    *,
    user_id: int,
    latitude: float | None = None,
    longitude: float | None = None,
) -> list[dict[str, Any]]:
    params: dict[str, Any] = {"user_id": user_id}
    query = """
        SELECT
            reference_date,
            horizon_months,
            projected_avg_temp_c,
            projected_total_precip_mm,
            projected_dry_days_ratio,
            baseline_avg_soil_moisture,
            baseline_avg_temp_c,
            heat_risk_score,
            water_stress_score,
            feature_payload
        FROM public.farm_horizon_prediction_features
        WHERE user_id = :user_id
          AND horizon_months = 1
    """
    if latitude is not None and longitude is not None:
        query += " AND latitude = :latitude AND longitude = :longitude"
        params["latitude"] = latitude
        params["longitude"] = longitude

    query += " ORDER BY reference_date DESC LIMIT 4"

    with engine.connect() as connection:
        rows = connection.execute(text(query), params).mappings().all()

    return _serialize_rows([dict(row) for row in rows])


def build_prediction_prompt(monitoring_rows: list[dict[str, Any]]) -> str:
    dataset_json = json.dumps(monitoring_rows, ensure_ascii=False)
    return (
        "Você é um agrônomo especialista em agricultura de precisão. "
        "Analise o dataset histórico e retorne predição + plano de ação estruturado.\n"
        "Responda APENAS em JSON válido com o formato:\n"
        "{\n"
        '  "diagnostico": {"nivel_risco": "baixo|medio|alto", "resumo": "..."},\n'
        '  "predicoes": [{"horizonte": "24h|7d|30d", "insight": "...", "confianca": 0.0}],\n'
        '  "acoes_recomendadas": [\n'
        '    {"prioridade": "alta|media|baixa", "acao": "...", "objetivo": "...", "prazo": "..."}\n'
        "  ],\n"
        '  "alertas": ["..."],\n'
        '  "metricas_chave": {"umidade_solo": "...", "temperatura_media": "...", "risco_climatico": "..."}\n'
        "}\n"
        "Baseie-se em manejo agrícola realista para monitoramento de fazenda.\n"
        f"Dataset:\n{dataset_json}"
    )


def build_prediction_prompt_with_horizons(
    monitoring_rows: list[dict[str, Any]],
    horizon_rows: list[dict[str, Any]],
) -> str:
    base_prompt = build_prediction_prompt(monitoring_rows)
    horizon_json = json.dumps(horizon_rows, ensure_ascii=False)
    return (
        f"{base_prompt}\n\n"
        "Considere também as features preditivas agregadas para estimativa de 30 dias:\n"
        f"{horizon_json}\n"
        "Use essas features para enriquecer as predições de curto prazo (até 30 dias)."
    )


def save_prediction_result(
    *,
    user_id: int,
    latitude: float | None,
    longitude: float | None,
    model_name: str,
    prompt_text: str,
    rows: list[dict[str, Any]],
    response_json: dict[str, Any],
) -> int:
    sql = text(
        """
        INSERT INTO public.farm_ai_predictions (
            user_id,
            latitude,
            longitude,
            prompt_version,
            model_name,
            input_rows_count,
            input_snapshot,
            prompt_text,
            response_json
        ) VALUES (
            :user_id,
            :latitude,
            :longitude,
            :prompt_version,
            :model_name,
            :input_rows_count,
            CAST(:input_snapshot AS jsonb),
            :prompt_text,
            CAST(:response_json AS jsonb)
        )
        RETURNING id
        """
    )

    params = {
        "user_id": user_id,
        "latitude": latitude,
        "longitude": longitude,
        "prompt_version": PROMPT_VERSION,
        "model_name": model_name,
        "input_rows_count": len(rows),
        "input_snapshot": json.dumps(rows, ensure_ascii=False),
        "prompt_text": prompt_text,
        "response_json": json.dumps(response_json, ensure_ascii=False),
    }

    with engine.begin() as connection:
        prediction_id = connection.execute(sql, params).scalar_one()

    return int(prediction_id)


async def generate_prediction(
    *,
    user_id: int | None = None,
    latitude: float | None = None,
    longitude: float | None = None,
    limit: int = 20,
) -> dict[str, Any]:
    resolved_user_id = user_id or _get_default_user_id()
    rows = get_recent_monitoring_data(
        user_id=resolved_user_id,
        latitude=latitude,
        longitude=longitude,
        limit=limit,
    )
    if not rows:
        return {
            "diagnostico": {
                "nivel_risco": "indefinido",
                "resumo": "Sem dados suficientes no banco para gerar predição.",
            },
            "predicoes": [],
            "acoes_recomendadas": [],
            "alertas": ["Coletar mais dados de monitoramento antes da análise."],
            "metricas_chave": {},
            "metadata": {"rows_analyzed": 0},
        }

    prompt = build_prediction_prompt(rows)
    horizon_rows = get_horizon_features(
        user_id=resolved_user_id,
        latitude=latitude,
        longitude=longitude,
    )
    if horizon_rows:
        prompt = build_prediction_prompt_with_horizons(rows, horizon_rows)
    raw_prediction = await GeminiClient().generate_structured_analysis(prompt=prompt)
    if isinstance(raw_prediction, dict):
        prediction = raw_prediction
    else:
        prediction = {
            "diagnostico": {
                "nivel_risco": "indefinido",
                "resumo": "Modelo retornou formato fora do esperado; mantendo resposta bruta para auditoria.",
            },
            "predicoes": [],
            "acoes_recomendadas": [],
            "alertas": ["Resposta da LLM fora do schema esperado."],
            "metricas_chave": {},
            "raw_llm_response": raw_prediction,
        }

    prediction_id = save_prediction_result(
        user_id=resolved_user_id,
        latitude=latitude,
        longitude=longitude,
        model_name=settings.gemini_model,
        prompt_text=prompt,
        rows=rows,
        response_json=prediction,
    )
    prediction["metadata"] = {
        "rows_analyzed": len(rows),
        "prediction_id": prediction_id,
        "prompt_version": PROMPT_VERSION,
        "model_name": settings.gemini_model,
    }
    # Send webhook only after analysis is generated and persisted.
    webhook_sent = await notify_insight_generated_async()
    prediction["metadata"]["webhook_insight_sent"] = webhook_sent
    return prediction
