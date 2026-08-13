-- ============================================================================
-- Phase 1: product metrics (backend only)
-- Phase 2: search-intent mining loop (own search logs -> landing page ideas)
-- ============================================================================

-- ── Shared: deterministic intent signature ──────────────────────────────────
CREATE OR REPLACE FUNCTION public.normalize_intent_signature(q text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH tokens AS (
    SELECT unnest(
      string_to_array(
        regexp_replace(lower(coalesce(q, '')), '[^a-z0-9 ]', ' ', 'g'),
        ' '
      )
    ) AS w
  ),
  kept AS (
    SELECT CASE
             WHEN length(w) > 3 AND right(w, 1) = 's' AND right(w, 2) <> 'ss'
               THEN left(w, length(w) - 1)
             ELSE w
           END AS w
    FROM tokens
    WHERE w <> ''
      AND w NOT IN (
        'a','an','the','that','this','which','with','without','for','of','to','in','on',
        'me','my','i','it','is','are','be','and','or','can','do','does','how','what',
        'show','find','all','some','any','best','good','great','cards','card','mtg',
        'magic','please','need','want','looking','list','give','get','there','their','you'
      )
  )
  SELECT coalesce(string_agg(DISTINCT w, ' ' ORDER BY w), '') FROM kept;
$$;

-- ── Phase 2 storage ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.search_intent_clusters (
  signature text PRIMARY KEY,
  canonical_query text NOT NULL,
  variant_count integer NOT NULL DEFAULT 0,
  search_count integer NOT NULL DEFAULT 0,
  searcher_count integer NOT NULL DEFAULT 0,
  zero_result_count integer NOT NULL DEFAULT 0,
  click_count integer NOT NULL DEFAULT 0,
  opportunity_score numeric NOT NULL DEFAULT 0,
  suggested_slug text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.search_intent_clusters TO service_role;
ALTER TABLE public.search_intent_clusters ENABLE ROW LEVEL SECURITY;
-- No policies: this table is internal to backend jobs and admin RPCs
-- (SECURITY DEFINER), never reachable from the client Data API.

CREATE INDEX IF NOT EXISTS search_intent_clusters_score_idx
  ON public.search_intent_clusters (status, opportunity_score DESC);

-- ── Phase 1: product metrics ────────────────────────────────────────────────
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
    'search_success_rate', (
      SELECT round(
        100.0 * count(*) FILTER (WHERE coalesce((event_data->>'results_count')::numeric, 0) > 0)
        / nullif(count(*), 0), 1)
      FROM searches
    ),
    'searches', (SELECT count(*) FROM searches),
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

CREATE OR REPLACE FUNCTION public.get_product_metrics(days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, admin_api
AS $$
BEGIN
  IF current_user <> 'service_role'
     AND current_setting('request.jwt.claim.role', true) <> 'service_role'
     AND NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  RETURN admin_api.get_product_metrics(days_back);
END;
$$;

REVOKE ALL ON FUNCTION public.get_product_metrics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_product_metrics(integer) TO authenticated, service_role;

-- ── Phase 2: refresh intent clusters from our own search logs ───────────────
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
      coalesce((event_data->>'results_count')::numeric, 0) AS results_count,
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
  clicks AS (
    SELECT
      coalesce(nullif(event_data->>'visitor_id', ''), session_id) AS visitor,
      created_at
    FROM public.analytics_events
    WHERE event_type = 'card_click'
      AND created_at >= since
      AND (event_data->>'is_internal') IS NULL
  ),
  agg AS (
    SELECT
      f.signature,
      count(*) AS search_count,
      count(DISTINCT f.q) AS variant_count,
      count(DISTINCT f.visitor) AS searcher_count,
      count(*) FILTER (WHERE f.results_count = 0) AS zero_result_count,
      min(f.created_at) AS first_seen_at,
      max(f.created_at) AS last_seen_at,
      (
        SELECT g.q FROM filtered g
        WHERE g.signature = f.signature
        GROUP BY g.q
        ORDER BY count(*) DESC, length(g.q) ASC
        LIMIT 1
      ) AS canonical_query,
      (
        SELECT count(*) FROM clicks c
        WHERE c.visitor = ANY (array_agg(DISTINCT f.visitor))
      ) AS click_count
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
    a.canonical_query,
    a.variant_count,
    a.search_count,
    a.searcher_count,
    a.zero_result_count,
    a.click_count,
    round(
      a.searcher_count * 2.0
      + a.variant_count * 1.5
      + a.search_count * 0.5
      - a.zero_result_count * 0.5,
      2
    ),
    regexp_replace(btrim(regexp_replace(a.canonical_query, '[^a-z0-9]+', '-', 'g'), '-'), '-+', '-', 'g'),
    a.first_seen_at,
    a.last_seen_at,
    now()
  FROM agg a
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
GRANT EXECUTE ON FUNCTION public.refresh_search_intent_clusters(integer) TO service_role;

-- ── Phase 2: opportunity report (admin only) ────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_intent_opportunities(
  min_searchers integer DEFAULT 3,
  max_results integer DEFAULT 50
)
RETURNS TABLE(
  signature text,
  canonical_query text,
  variant_count integer,
  search_count integer,
  searcher_count integer,
  zero_result_count integer,
  opportunity_score numeric,
  suggested_slug text,
  already_covered boolean,
  last_seen_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user <> 'service_role'
     AND current_setting('request.jwt.claim.role', true) <> 'service_role'
     AND NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  SELECT
    c.signature,
    c.canonical_query,
    c.variant_count,
    c.search_count,
    c.searcher_count,
    c.zero_result_count,
    c.opportunity_score,
    c.suggested_slug,
    (EXISTS (SELECT 1 FROM public.curated_searches cs WHERE cs.slug = c.suggested_slug)
      OR EXISTS (SELECT 1 FROM public.seo_pages sp WHERE sp.slug = c.suggested_slug)) AS already_covered,
    c.last_seen_at
  FROM public.search_intent_clusters c
  WHERE c.status = 'new'
    AND c.searcher_count >= greatest(coalesce(min_searchers, 3), 1)
  ORDER BY c.opportunity_score DESC
  LIMIT greatest(coalesce(max_results, 50), 1);
END;
$$;

REVOKE ALL ON FUNCTION public.get_intent_opportunities(integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_intent_opportunities(integer, integer) TO authenticated, service_role;

-- ── Daily cron: mine intents from our own search logs ───────────────────────
SELECT cron.unschedule('refresh-search-intent-clusters')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'refresh-search-intent-clusters');

SELECT cron.schedule(
  'refresh-search-intent-clusters',
  '25 5 * * *',
  $cron$ SELECT public.refresh_search_intent_clusters(90); $cron$
);