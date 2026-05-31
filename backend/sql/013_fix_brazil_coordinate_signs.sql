-- Corrige coordenadas cadastradas com sinais invertidos (comum em fazendas no Brasil).
UPDATE public.farm_coordinates
SET
    latitude = -ABS(latitude),
    longitude = -ABS(longitude),
    updated_at = NOW()
WHERE latitude > 0
  AND longitude > 0
  AND latitude BETWEEN 5 AND 35
  AND longitude BETWEEN 30 AND 75;
