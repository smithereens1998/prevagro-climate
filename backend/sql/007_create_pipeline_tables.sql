CREATE TABLE IF NOT EXISTS public.farm_ingestion_runs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.usuarios(id),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    polygon_id TEXT,
    status TEXT NOT NULL,
    records_processed INTEGER NOT NULL DEFAULT 0,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_farm_ingestion_runs_user_started
    ON public.farm_ingestion_runs (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS public.farm_monthly_features (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.usuarios(id),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    year_month DATE NOT NULL,
    samples_total INTEGER NOT NULL DEFAULT 0,
    weather_samples INTEGER NOT NULL DEFAULT 0,
    soil_samples INTEGER NOT NULL DEFAULT 0,
    satellite_samples INTEGER NOT NULL DEFAULT 0,
    avg_temp_celsius NUMERIC(8, 3),
    min_temp_celsius NUMERIC(8, 3),
    max_temp_celsius NUMERIC(8, 3),
    avg_humidity_percent NUMERIC(8, 3),
    avg_soil_moisture NUMERIC(10, 5),
    avg_soil_temp_surface_celsius NUMERIC(8, 3),
    avg_soil_temp_10cm_celsius NUMERIC(8, 3),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT farm_monthly_features_unique
        UNIQUE (user_id, latitude, longitude, year_month)
);

CREATE INDEX IF NOT EXISTS idx_farm_monthly_features_user_month
    ON public.farm_monthly_features (user_id, year_month DESC);
