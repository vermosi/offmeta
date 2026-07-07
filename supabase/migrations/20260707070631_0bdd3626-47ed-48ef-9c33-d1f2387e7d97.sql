CREATE OR REPLACE FUNCTION public.get_search_failure_breakdown(
  since_date timestamp with time zone,
  until_date timestamp with time zone DEFAULT now()
)
RETURNS TABLE (
  failure_reason text,
  total bigint,
  share_pct numeric,
  fuzzy_attempted bigint,
  fuzzy_resolved bigint,
  fuzzy_fix_rate_pct numeric
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Admin-only: mirrors other admin analytics RPCs
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  WITH failures AS (
    SELECT
      COALESCE(ae.event_data->>'failure_reason', 'unknown') AS reason,
      COALESCE((ae.event_data->>'fuzzy_attempted')::boolean, false) AS fuzzy_att,
      COALESCE((ae.event_data->>'fuzzy_resolved')::boolean, false) AS fuzzy_res
    FROM public.analytics_events ae
    WHERE ae.event_type = 'search_failure'
      AND ae.event_data->>'error_type' = 'zero_results'
      AND ae.created_at >= since_date
      AND ae.created_at <  until_date
  ),
  agg AS (
    SELECT
      reason,
      COUNT(*)::bigint AS total,
      SUM(CASE WHEN fuzzy_att THEN 1 ELSE 0 END)::bigint AS fuzzy_attempted,
      SUM(CASE WHEN fuzzy_res THEN 1 ELSE 0 END)::bigint AS fuzzy_resolved
    FROM failures
    GROUP BY reason
  ),
  total_row AS (SELECT SUM(total) AS grand_total FROM agg)
  SELECT
    a.reason AS failure_reason,
    a.total,
    ROUND(
      100.0 * a.total / NULLIF((SELECT grand_total FROM total_row), 0),
      2
    ) AS share_pct,
    a.fuzzy_attempted,
    a.fuzzy_resolved,
    ROUND(
      100.0 * a.fuzzy_resolved / NULLIF(a.fuzzy_attempted, 0),
      2
    ) AS fuzzy_fix_rate_pct
  FROM agg a
  ORDER BY a.total DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_search_failure_breakdown(timestamp with time zone, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_search_failure_breakdown(timestamp with time zone, timestamp with time zone) TO service_role;