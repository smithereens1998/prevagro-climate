ALTER TABLE public.farm_coordinates
    ADD COLUMN IF NOT EXISTS polygon_id TEXT;

CREATE INDEX IF NOT EXISTS idx_farm_coordinates_polygon_id
    ON public.farm_coordinates (polygon_id);
