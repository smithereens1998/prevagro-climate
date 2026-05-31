CREATE TABLE IF NOT EXISTS public.farm_seasonal_forecasts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.usuarios(id),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    source_name TEXT NOT NULL,
    model_name TEXT NOT NULL,
    forecast_date DATE NOT NULL,
    temp_mean_c NUMERIC(8, 3),
    temp_max_c NUMERIC(8, 3),
    temp_min_c NUMERIC(8, 3),
    precipitation_mm NUMERIC(10, 3),
    dry_day_flag BOOLEAN NOT NULL DEFAULT FALSE,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT farm_seasonal_forecasts_unique
        UNIQUE (user_id, latitude, longitude, source_name, model_name, forecast_date)
);

CREATE INDEX IF NOT EXISTS idx_farm_seasonal_forecasts_user_date
    ON public.farm_seasonal_forecasts (user_id, forecast_date);

CREATE TABLE IF NOT EXISTS public.farm_horizon_prediction_features (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.usuarios(id),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    reference_date DATE NOT NULL,
    horizon_months INTEGER NOT NULL CHECK (horizon_months IN (6, 12)),
    projected_avg_temp_c NUMERIC(8, 3),
    projected_total_precip_mm NUMERIC(12, 3),
    projected_dry_days_ratio NUMERIC(8, 4),
    baseline_avg_soil_moisture NUMERIC(10, 5),
    baseline_avg_temp_c NUMERIC(8, 3),
    heat_risk_score NUMERIC(8, 4),
    water_stress_score NUMERIC(8, 4),
    feature_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT farm_horizon_prediction_features_unique
        UNIQUE (user_id, latitude, longitude, reference_date, horizon_months)
);

CREATE INDEX IF NOT EXISTS idx_farm_horizon_features_user_ref
    ON public.farm_horizon_prediction_features (user_id, reference_date DESC, horizon_months);
