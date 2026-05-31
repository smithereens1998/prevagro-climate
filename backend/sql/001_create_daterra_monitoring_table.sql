CREATE TABLE IF NOT EXISTS public.farm_monitoring_records (
    id BIGSERIAL PRIMARY KEY,
    farm_name TEXT NOT NULL DEFAULT 'Fazenda Daterra Coffee',
    farm_location TEXT NOT NULL DEFAULT 'Patrocinio, Minas Gerais, Brasil',
    latitude NUMERIC(9, 6) NOT NULL DEFAULT 18.943900,
    longitude NUMERIC(9, 6) NOT NULL DEFAULT 46.992500,
    observed_at TIMESTAMPTZ NOT NULL,
    data_provider TEXT NOT NULL DEFAULT 'agromonitoring',
    weather_temp_kelvin NUMERIC(7, 3),
    weather_temp_celsius NUMERIC(7, 3),
    weather_feels_like_kelvin NUMERIC(7, 3),
    weather_feels_like_celsius NUMERIC(7, 3),
    weather_temp_min_kelvin NUMERIC(7, 3),
    weather_temp_min_celsius NUMERIC(7, 3),
    weather_temp_max_kelvin NUMERIC(7, 3),
    weather_temp_max_celsius NUMERIC(7, 3),
    weather_humidity_percent NUMERIC(5, 2),
    weather_pressure_hpa NUMERIC(7, 2),
    wind_speed_mps NUMERIC(7, 3),
    wind_direction_deg NUMERIC(6, 2),
    cloudiness_percent NUMERIC(5, 2),
    soil_moisture NUMERIC(8, 5),
    soil_temp_surface_kelvin NUMERIC(7, 3),
    soil_temp_surface_celsius NUMERIC(7, 3),
    soil_temp_10cm_kelvin NUMERIC(7, 3),
    soil_temp_10cm_celsius NUMERIC(7, 3),
    satellite_source TEXT,
    vegetation_stats JSONB,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT farm_monitoring_records_latitude_check CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT farm_monitoring_records_longitude_check CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX IF NOT EXISTS idx_farm_monitoring_records_observed_at
    ON public.farm_monitoring_records (observed_at DESC);

CREATE INDEX IF NOT EXISTS idx_farm_monitoring_records_farm_observed
    ON public.farm_monitoring_records (farm_name, observed_at DESC);
