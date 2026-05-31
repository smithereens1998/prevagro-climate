import asyncio
import json
import sys
from pathlib import Path

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.database import engine
from app.services.llm_predictions import generate_prediction


async def run() -> None:
    prediction = await generate_prediction(limit=10)
    print(json.dumps(prediction, indent=2, ensure_ascii=False))

    prediction_id = prediction.get("metadata", {}).get("prediction_id")
    print(f"prediction_id={prediction_id}")

    if not prediction_id:
        print("No persisted prediction id returned.")
        return

    with engine.connect() as connection:
        row = connection.execute(
            text(
                """
                SELECT id, user_id, prompt_version, model_name, input_rows_count, created_at
                FROM public.farm_ai_predictions
                WHERE id = :id
                """
            ),
            {"id": prediction_id},
        ).mappings().one_or_none()

    print(dict(row) if row else None)


if __name__ == "__main__":
    asyncio.run(run())
