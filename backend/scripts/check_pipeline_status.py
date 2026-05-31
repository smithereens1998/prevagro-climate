import sys
from pathlib import Path

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.database import engine


def run() -> None:
    with engine.connect() as connection:
        latest_ingestion = connection.execute(
            text(
                """
                SELECT id, status, records_processed, started_at, finished_at
                FROM public.farm_ingestion_runs
                ORDER BY id DESC
                LIMIT 1
                """
            )
        ).mappings().one_or_none()

        latest_prediction = connection.execute(
            text(
                """
                SELECT id, prompt_version, model_name, created_at
                FROM public.farm_ai_predictions
                ORDER BY id DESC
                LIMIT 1
                """
            )
        ).mappings().one_or_none()

    print("latest_ingestion:", dict(latest_ingestion) if latest_ingestion else None)
    print("latest_llm_prediction:", dict(latest_prediction) if latest_prediction else None)


if __name__ == "__main__":
    run()
