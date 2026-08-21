REVOKE ALL ON FUNCTION public.get_recommendation_rollout_assignment_v2(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_recommendation_rollout_observation_v2(
  TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_recommendation_rollout_assignment_v2(TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_recommendation_rollout_observation_v2(
  TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO service_role;