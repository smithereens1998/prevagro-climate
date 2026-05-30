ALTER TABLE public.farm_monitoring_records
    ADD COLUMN IF NOT EXISTS polygon_id TEXT,
    ADD COLUMN IF NOT EXISTS polygon_geojson JSONB,
    ADD COLUMN IF NOT EXISTS polygon_center_latitude NUMERIC(9, 6),
    ADD COLUMN IF NOT EXISTS polygon_center_longitude NUMERIC(9, 6),
    ADD COLUMN IF NOT EXISTS polygon_area NUMERIC(14, 4);

CREATE INDEX IF NOT EXISTS idx_farm_monitoring_records_polygon_id
    ON public.farm_monitoring_records (polygon_id);
