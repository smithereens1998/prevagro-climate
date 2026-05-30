import sys
from pathlib import Path

from sqlalchemy import text

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.db.database import engine


def run() -> None:
    with engine.connect() as connection:
        forecast_row = connection.execute(
            text(
                """
                SELECT source_name, model_name, COUNT(*) AS rows_count
                FROM public.farm_seasonal_forecasts
                GROUP BY source_name, model_name
                ORDER BY rows_count DESC
                LIMIT 1
                """
            )
        ).mappings().one_or_none()

        features_rows = connection.execute(
            text(
                """
                SELECT horizon_months, projected_avg_temp_c, projected_total_precip_mm, water_stress_score
                FROM public.farm_horizon_prediction_features
                ORDER BY reference_date DESC, horizon_months ASC
                LIMIT 2
                """
            )
        ).mappings().all()

    print(dict(forecast_row) if forecast_row else None)
    print([dict(row) for row in features_rows])


if __name__ == "__main__":
    run()
