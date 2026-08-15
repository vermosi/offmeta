CREATE OR REPLACE FUNCTION public.get_search_outcome_breakdown(days_back integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_since timestamptz := now() - make_interval(days => greatest(coalesce(days_back, 7), 1));
  v_started integer;
  v_outcomes jsonb;
  v_p50 numeric;
  v_p75 numeric;
BEGIN
  IF current_user <> 'service_role'
     AND current_setting('request.jwt.claim.role', true) <> 'service_role'
     AND NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT count(*)::int INTO v_started
  FROM public.analytics_events
  WHERE event_type = 'search_started'
    AND created_at >= v_since
    AND coalesce(event_data->>'is_internal', 'false') <> 'true';

  SELECT coalesce(jsonb_agg(t ORDER BY t.total DESC), '[]'::jsonb) INTO v_outcomes
  FROM (
    SELECT
      coalesce(event_data->>'outcome', 'unknown') AS outcome,
      count(*)::int AS total,
      count(*) FILTER (WHERE coalesce(event_data->>'degraded_reason', '') <> '')::int AS degraded,
      round(percentile_cont(0.75) WITHIN GROUP (
        ORDER BY nullif(event_data->>'elapsed_ms', '')::numeric
      )::numeric, 0) AS p75_elapsed_ms
    FROM public.analytics_events
    WHERE event_type = 'search_outcome'
      AND created_at >= v_since
      AND coalesce(event_data->>'is_internal', 'false') <> 'true'
    GROUP BY 1
  ) t;

  SELECT
    round(percentile_cont(0.5) WITHIN GROUP (ORDER BY ms)::numeric, 0),
    round(percentile_cont(0.75) WITHIN GROUP (ORDER BY ms)::numeric, 0)
  INTO v_p50, v_p75
  FROM (
    SELECT nullif(event_data->>'elapsed_ms', '')::numeric AS ms
    FROM public.analytics_events
    WHERE event_type = 'search_outcome'
      AND created_at >= v_since
      AND event_data->>'outcome' = 'results'
      AND coalesce(event_data->>'is_internal', 'false') <> 'true'
  ) r
  WHERE ms IS NOT NULL;

  RETURN jsonb_build_object(
    'since', v_since,
    'days_back', greatest(coalesce(days_back, 7), 1),
    'searches_started', coalesce(v_started, 0),
    'outcomes', v_outcomes,
    'time_to_results_p50_ms', v_p50,
    'time_to_results_p75_ms', v_p75
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_search_outcome_breakdown(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_search_outcome_breakdown(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_search_outcome_breakdown(integer) TO service_role;