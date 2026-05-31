ALTER TABLE public.farm_horizon_prediction_features
    DROP CONSTRAINT IF EXISTS farm_horizon_prediction_features_horizon_months_check;

ALTER TABLE public.farm_horizon_prediction_features
    ADD CONSTRAINT farm_horizon_prediction_features_horizon_months_check
    CHECK (horizon_months IN (1, 6, 12));
