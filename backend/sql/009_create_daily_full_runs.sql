CREATE TABLE IF NOT EXISTS public.farm_daily_full_runs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.usuarios(id),
    run_date DATE NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    trigger_source TEXT NOT NULL DEFAULT 'manual',
    status TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_message TEXT,
    duration_ms BIGINT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT farm_daily_full_runs_unique_user_date UNIQUE (user_id, run_date)
);

CREATE INDEX IF NOT EXISTS idx_farm_daily_full_runs_user_started
    ON public.farm_daily_full_runs (user_id, started_at DESC);
