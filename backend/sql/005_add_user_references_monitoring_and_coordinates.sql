ALTER TABLE public.farm_monitoring_records
    ADD COLUMN IF NOT EXISTS user_id BIGINT;

ALTER TABLE public.farm_coordinates
    ADD COLUMN IF NOT EXISTS user_id BIGINT;

UPDATE public.farm_monitoring_records fmr
SET user_id = u.id
FROM public.usuarios u
WHERE fmr.user_id IS NULL
  AND u.email = 'prevagro@gmail.com';

UPDATE public.farm_coordinates fc
SET user_id = u.id
FROM public.usuarios u
WHERE fc.user_id IS NULL
  AND u.email = 'prevagro@gmail.com';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'farm_monitoring_records_user_id_fkey'
    ) THEN
        ALTER TABLE public.farm_monitoring_records
            ADD CONSTRAINT farm_monitoring_records_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.usuarios(id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'farm_coordinates_user_id_fkey'
    ) THEN
        ALTER TABLE public.farm_coordinates
            ADD CONSTRAINT farm_coordinates_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES public.usuarios(id);
    END IF;
END $$;

DROP INDEX IF EXISTS idx_farm_monitoring_records_unique_coord_observed_provider;

CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_monitoring_records_unique_user_coord_observed_provider
    ON public.farm_monitoring_records (user_id, latitude, longitude, observed_at, data_provider);

ALTER TABLE public.farm_coordinates
    DROP CONSTRAINT IF EXISTS farm_coordinates_lat_lon_unique;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'farm_coordinates_user_lat_lon_unique'
    ) THEN
        ALTER TABLE public.farm_coordinates
            ADD CONSTRAINT farm_coordinates_user_lat_lon_unique
            UNIQUE (user_id, latitude, longitude);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_farm_monitoring_records_user_id
    ON public.farm_monitoring_records (user_id);

CREATE INDEX IF NOT EXISTS idx_farm_coordinates_user_id
    ON public.farm_coordinates (user_id);
