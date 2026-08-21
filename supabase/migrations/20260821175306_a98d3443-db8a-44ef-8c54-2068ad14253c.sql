ALTER FUNCTION public.get_recommendation_rollout_assignment_v2(TEXT)
  SET statement_timeout = '3s';

ALTER FUNCTION public.record_recommendation_rollout_observation_v2(
  TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) SET statement_timeout = '5s';