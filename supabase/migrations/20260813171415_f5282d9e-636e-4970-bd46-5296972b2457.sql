CREATE OR REPLACE FUNCTION public.refresh_search_intent_clusters(days_back integer DEFAULT 90)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(coalesce(days_back, 90), 1));
  touched integer := 0;
BEGIN
  WITH raw AS (
    SELECT
      lower(btrim(event_data->>'query')) AS q,
      public.normalize_intent_signature(event_data->>'query') AS signature,
      coalesce(nullif(event_data->>'visitor_id', ''), session_id) AS visitor,
      session_id,
      created_at
    FROM public.analytics_events
    WHERE event_type = 'search'
      AND created_at >= since
      AND (event_data->>'is_internal') IS NULL
      AND coalesce(btrim(event_data->>'query'), '') <> ''
  ),
  filtered AS (
    SELECT * FROM raw
    WHERE signature <> '' AND array_length(string_to_array(signature, ' '), 1) >= 2
  ),
  failures AS (
    SELECT
      public.normalize_intent_signature(event_data->>'query') AS signature,
      count(*) AS zero_result_count
    FROM public.analytics_events
    WHERE event_type = 'search_failure'
      AND created_at >= since
      AND (event_data->>'is_internal') IS NULL
    GROUP BY 1
  ),
  clicks AS (
    SELECT DISTINCT session_id, created_at
    FROM public.analytics_events
    WHERE event_type = 'card_click'
      AND created_at >= since
      AND (event_data->>'is_internal') IS NULL
      AND session_id IS NOT NULL
  ),
  cluster_clicks AS (
    SELECT f.signature, count(*) AS click_count
    FROM filtered f
    JOIN clicks c
      ON c.session_id = f.session_id
     AND c.created_at BETWEEN f.created_at AND f.created_at + interval '10 minutes'
    GROUP BY f.signature
  ),
  canonical AS (
    SELECT DISTINCT ON (signature) signature, q
    FROM (
      SELECT signature, q, count(*) AS n, length(q) AS len
      FROM filtered GROUP BY signature, q
    ) v
    ORDER BY signature, n DESC, len ASC
  ),
  agg AS (
    SELECT
      f.signature,
      count(*) AS search_count,
      count(DISTINCT f.q) AS variant_count,
      count(DISTINCT f.visitor) AS searcher_count,
      min(f.created_at) AS first_seen_at,
      max(f.created_at) AS last_seen_at
    FROM filtered f
    GROUP BY f.signature
  )
  INSERT INTO public.search_intent_clusters AS sc (
    signature, canonical_query, variant_count, search_count, searcher_count,
    zero_result_count, click_count, opportunity_score, suggested_slug,
    first_seen_at, last_seen_at, updated_at
  )
  SELECT
    a.signature,
    c.q,
    a.variant_count,
    a.search_count,
    a.searcher_count,
    coalesce(fl.zero_result_count, 0),
    coalesce(cc.click_count, 0),
    round(
      a.searcher_count * 2.0
      + a.variant_count * 1.5
      + a.search_count * 0.5
      + coalesce(cc.click_count, 0) * 0.25
      - coalesce(fl.zero_result_count, 0) * 0.5,
      2
    ),
    btrim(regexp_replace(regexp_replace(c.q, '[^a-z0-9]+', '-', 'g'), '-+', '-', 'g'), '-'),
    a.first_seen_at,
    a.last_seen_at,
    now()
  FROM agg a
  JOIN canonical c ON c.signature = a.signature
  LEFT JOIN failures fl ON fl.signature = a.signature
  LEFT JOIN cluster_clicks cc ON cc.signature = a.signature
  ON CONFLICT (signature) DO UPDATE SET
    canonical_query = EXCLUDED.canonical_query,
    variant_count = EXCLUDED.variant_count,
    search_count = EXCLUDED.search_count,
    searcher_count = EXCLUDED.searcher_count,
    zero_result_count = EXCLUDED.zero_result_count,
    click_count = EXCLUDED.click_count,
    opportunity_score = EXCLUDED.opportunity_score,
    suggested_slug = EXCLUDED.suggested_slug,
    last_seen_at = EXCLUDED.last_seen_at,
    updated_at = now()
  WHERE sc.status <> 'dismissed';

  GET DIAGNOSTICS touched = ROW_COUNT;

  RETURN jsonb_build_object('clusters_upserted', touched, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_search_intent_clusters(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_search_intent_clusters(integer) TO service_role, postgres;

-- Seed immediately so the loop has data on day one.
SELECT public.refresh_search_intent_clusters(90);