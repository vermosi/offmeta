CREATE OR REPLACE FUNCTION admin_api.get_product_metrics(days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, admin_api
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(coalesce(days_back, 30), 1));
  result jsonb;
BEGIN
  WITH ev AS (
    SELECT
      event_type,
      event_data,
      session_id,
      coalesce(nullif(event_data->>'visitor_id', ''), session_id) AS visitor,
      created_at
    FROM public.analytics_events
    WHERE created_at >= since
      AND (event_data->>'is_internal') IS NULL
  ),
  searches AS (
    SELECT * FROM ev WHERE event_type = 'search'
  ),
  outcomes AS (
    SELECT * FROM ev WHERE event_type IN ('search_success', 'search_failure')
  ),
  sess AS (
    SELECT
      session_id,
      count(*) FILTER (WHERE event_type = 'search') AS searches,
      bool_or(event_type = 'card_click') AS clicked,
      bool_or(event_type IN (
        'rerun_edited_query','understood_summary_changed','understood_summary_adjust',
        'matched_concept_chip_clicked','why_matches_refine_clicked',
        'similar_panel_refine_clicked','related_searches_clicked','search_recovery_clicked'
      )) AS refined,
      bool_or(event_type IN ('affiliate_click','share_clicked','deck_click','card_page_view')) AS acted,
      bool_or(event_type IN ('landing_page_view','homepage_view')) AS landed
    FROM ev
    WHERE session_id IS NOT NULL
    GROUP BY session_id
  ),
  searcher_days AS (
    SELECT visitor, count(DISTINCT created_at::date) AS active_days
    FROM searches
    WHERE visitor IS NOT NULL
    GROUP BY visitor
  ),
  first_seen AS (
    SELECT
      coalesce(nullif(event_data->>'visitor_id', ''), session_id) AS visitor,
      min(created_at) AS first_at,
      max(created_at) AS last_at
    FROM public.analytics_events
    WHERE (event_data->>'is_internal') IS NULL
    GROUP BY 1
  )
  SELECT jsonb_build_object(
    'window_days', greatest(coalesce(days_back, 30), 1),
    'generated_at', now(),
    'searches', (SELECT count(*) FROM searches),
    'search_success_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE event_type = 'search_success')
        / nullif(count(*), 0), 1)
      FROM outcomes
    ),
    'zero_result_searches', (
      SELECT count(*) FROM outcomes WHERE event_type = 'search_failure'
    ),
    'search_to_card_click_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE clicked) / nullif(count(*), 0), 1)
      FROM sess WHERE searches > 0
    ),
    'search_to_refinement_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE refined) / nullif(count(*), 0), 1)
      FROM sess WHERE searches > 0
    ),
    'searches_per_session', (
      SELECT round(avg(searches)::numeric, 2) FROM sess WHERE searches > 0
    ),
    'returning_searchers', (
      SELECT count(*) FROM searcher_days WHERE active_days >= 2
    ),
    'total_searchers', (SELECT count(*) FROM searcher_days),
    'returning_searcher_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE active_days >= 2) / nullif(count(*), 0), 1)
      FROM searcher_days
    ),
    'retention_d7', (
      SELECT round(100.0 * count(*) FILTER (WHERE last_at >= first_at + interval '7 days')
        / nullif(count(*), 0), 1)
      FROM first_seen
      WHERE first_at BETWEEN now() - interval '37 days' AND now() - interval '7 days'
    ),
    'retention_d30', (
      SELECT round(100.0 * count(*) FILTER (WHERE last_at >= first_at + interval '30 days')
        / nullif(count(*), 0), 1)
      FROM first_seen
      WHERE first_at BETWEEN now() - interval '90 days' AND now() - interval '30 days'
    ),
    'landing_to_search_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE searches > 0) / nullif(count(*), 0), 1)
      FROM sess WHERE landed
    ),
    'search_to_external_action_rate', (
      SELECT round(100.0 * count(*) FILTER (WHERE acted) / nullif(count(*), 0), 1)
      FROM sess WHERE searches > 0
    )
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_search_intent_clusters(integer) TO postgres;