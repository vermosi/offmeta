CREATE OR REPLACE FUNCTION public.get_self_heal_diagnostics(days_back integer DEFAULT 7, max_items integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(days => GREATEST(COALESCE(days_back, 7), 1));
  v_limit integer := LEAST(GREATEST(COALESCE(max_items, 50), 1), 200);
  v_buckets jsonb;
  v_items jsonb;
  v_totals jsonb;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH unrepairable AS (
    SELECT r.started_at, d
    FROM public.self_heal_runs r
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(r.details, '[]'::jsonb)) AS d
    WHERE r.started_at >= v_since
      AND d->>'status' = 'unrepairable'
  ),
  attempt_codes AS (
    SELECT a->>'code' AS code
    FROM unrepairable u
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(u.d->'attempts', '[]'::jsonb)) AS a
  )
  SELECT
    COALESCE(
      (SELECT jsonb_agg(x ORDER BY x.attempt_count DESC)
       FROM (
         SELECT
           COALESCE(ac.code, 'unknown') AS code,
           COUNT(*)::int AS attempt_count,
           (SELECT COUNT(*)::int FROM unrepairable u2
             WHERE u2.d->>'reasonCode' = ac.code) AS final_count
         FROM attempt_codes ac
         GROUP BY ac.code
       ) x), '[]'::jsonb),
    COALESCE(
      (SELECT jsonb_agg(y ORDER BY y.started_at DESC)
       FROM (
         SELECT
           u.started_at,
           u.d->>'query' AS query,
           u.d->>'before' AS before_query,
           u.d->>'after' AS after_query,
           u.d->>'reasonCode' AS reason_code,
           u.d->>'reason' AS reason,
           COALESCE((u.d->>'attemptCount')::int, 0) AS attempt_count,
           COALESCE(u.d->'reasonCounts', '{}'::jsonb) AS reason_counts
         FROM unrepairable u
         ORDER BY u.started_at DESC
         LIMIT v_limit
       ) y), '[]'::jsonb),
    jsonb_build_object(
      'unrepairable', (SELECT COUNT(*)::int FROM unrepairable),
      'total_attempts', (SELECT COUNT(*)::int FROM attempt_codes)
    )
  INTO v_buckets, v_items, v_totals;

  RETURN jsonb_build_object(
    'since', v_since,
    'days_back', GREATEST(COALESCE(days_back, 7), 1),
    'totals', COALESCE(v_totals, '{}'::jsonb) || jsonb_build_object(
      'runs', (SELECT COUNT(*)::int FROM public.self_heal_runs WHERE started_at >= v_since),
      'repaired', (SELECT COALESCE(SUM(repaired), 0)::int FROM public.self_heal_runs WHERE started_at >= v_since),
      'skipped', (SELECT COALESCE(SUM(skipped), 0)::int FROM public.self_heal_runs WHERE started_at >= v_since)
    ),
    'buckets', v_buckets,
    'items', v_items
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_self_heal_diagnostics(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_self_heal_diagnostics(integer, integer) TO authenticated, service_role;