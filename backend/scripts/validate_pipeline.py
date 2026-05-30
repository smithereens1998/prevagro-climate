import sys
from pathlib import Path

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.database import engine


def run() -> None:
    with engine.connect() as connection:
        run_row = connection.execute(
            text(
                """
                SELECT id, status, records_processed, started_at, finished_at
                FROM public.farm_ingestion_runs
                ORDER BY id DESC
                LIMIT 1
                """
            )
        ).mappings().one_or_none()

        feature_row = connection.execute(
            text(
                """
                SELECT
                    year_month,
                    samples_total,
                    weather_samples,
                    soil_samples,
                    satellite_samples,
                    avg_temp_celsius,
                    avg_soil_moisture
                FROM public.farm_monthly_features
                ORDER BY id DESC
                LIMIT 1
                """
            )
        ).mappings().one_or_none()

    print(dict(run_row) if run_row else None)
    print(dict(feature_row) if feature_row else None)


if __name__ == "__main__":
    run()
