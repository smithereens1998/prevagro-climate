CREATE TABLE IF NOT EXISTS public.farm_coordinates (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT farm_coordinates_latitude_check CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT farm_coordinates_longitude_check CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT farm_coordinates_lat_lon_unique UNIQUE (latitude, longitude)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_farm_monitoring_records_unique_coord_observed_provider
    ON public.farm_monitoring_records (latitude, longitude, observed_at, data_provider);
