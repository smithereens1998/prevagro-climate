CREATE TABLE IF NOT EXISTS public.farm_ai_predictions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES public.usuarios(id),
    latitude NUMERIC(9, 6),
    longitude NUMERIC(9, 6),
    prompt_version TEXT NOT NULL,
    model_name TEXT NOT NULL,
    input_rows_count INTEGER NOT NULL DEFAULT 0,
    input_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
    prompt_text TEXT NOT NULL,
    response_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_farm_ai_predictions_user_created
    ON public.farm_ai_predictions (user_id, created_at DESC);
