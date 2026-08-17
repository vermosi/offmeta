-- Recommendation/query intelligence V2.
-- One row per request prevents multiple clicks or duplicate success events from
-- corrupting per-query denominators. Legacy events without both query and
-- request_id are deliberately excluded from the backfill.

ALTER TABLE public.search_feedback
  ADD COLUMN IF NOT EXISTS request_id TEXT,
  ADD COLUMN IF NOT EXISTS surface TEXT,
  ADD COLUMN IF NOT EXISTS ranker_version TEXT,
  ADD COLUMN IF NOT EXISTS rejected_card_id TEXT,
  ADD COLUMN IF NOT EXISTS result_rank INTEGER;

CREATE INDEX IF NOT EXISTS idx_search_feedback_request_id
  ON public.search_feedback (request_id)
  WHERE request_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.query_request_outcomes_v2 (
  request_id TEXT NOT NULL,
  normalized_query TEXT NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'v2',
  searched BOOLEAN NOT NULL DEFAULT false,
  succeeded BOOLEAN NOT NULL DEFAULT false,
  clicked BOOLEAN NOT NULL DEFAULT false,
  refined BOOLEAN NOT NULL DEFAULT false,
  zero_results BOOLEAN NOT NULL DEFAULT false,
  rejected BOOLEAN NOT NULL DEFAULT false,
  abandoned BOOLEAN NOT NULL DEFAULT false,
  first_click_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, normalized_query, model_version)
);

CREATE TABLE IF NOT EXISTS public.query_intelligence_agg_v2 (
  normalized_query TEXT NOT NULL,
  model_version TEXT NOT NULL DEFAULT 'v2',
  searches INTEGER NOT NULL DEFAULT 0,
  successful_searches INTEGER NOT NULL DEFAULT 0,
  satisfied_searches INTEGER NOT NULL DEFAULT 0,
  refinements INTEGER NOT NULL DEFAULT 0,
  zero_results INTEGER NOT NULL DEFAULT 0,
  negative_feedback INTEGER NOT NULL DEFAULT 0,
  abandonments INTEGER NOT NULL DEFAULT 0,
  avg_time_to_click_ms NUMERIC,
  search_quality_score NUMERIC NOT NULL DEFAULT 0,
  confidence NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (normalized_query, model_version)
);

ALTER TABLE public.query_request_outcomes_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_intelligence_agg_v2 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages query request outcomes v2"
  ON public.query_request_outcomes_v2;
CREATE POLICY "Service role manages query request outcomes v2"
  ON public.query_request_outcomes_v2 FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role manages query intelligence v2"
  ON public.query_intelligence_agg_v2;
CREATE POLICY "Service role manages query intelligence v2"
  ON public.query_intelligence_agg_v2 FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins read query intelligence v2"
  ON public.query_intelligence_agg_v2;
CREATE POLICY "Admins read query intelligence v2"
  ON public.query_intelligence_agg_v2 FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.compute_query_quality_v2(
  p_searches INTEGER,
  p_satisfied INTEGER,
  p_zero_results INTEGER,
  p_refinements INTEGER,
  p_negative_feedback INTEGER
) RETURNS TABLE(score NUMERIC, confidence NUMERIC)
LANGUAGE sql
IMMUTABLE
SET search_path TO public
AS $$
  SELECT
    ROUND(LEAST(1, GREATEST(0,
      0.50 * ((p_satisfied + 2)::NUMERIC / (GREATEST(p_searches, 0) + 5)::NUMERIC)
      + 0.20 * (1 - ((p_zero_results + 1)::NUMERIC / (GREATEST(p_searches, 0) + 10)::NUMERIC))
      + 0.20 * (1 - ((p_refinements + 1)::NUMERIC / (GREATEST(p_searches, 0) + 10)::NUMERIC))
      + 0.10 * (1 - ((p_negative_feedback + 1)::NUMERIC / (GREATEST(p_searches, 0) + 20)::NUMERIC))
    ))::NUMERIC, 4),
    ROUND((1 - EXP(-GREATEST(p_searches, 0)::NUMERIC / 25::NUMERIC))::NUMERIC, 4);
$$;

CREATE OR REPLACE FUNCTION public.refresh_query_intelligence_v2(
  p_query TEXT DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('refresh_query_intelligence_v2'));
  IF p_query IS NULL THEN
    TRUNCATE public.query_intelligence_agg_v2;
  ELSE
    DELETE FROM public.query_intelligence_agg_v2
    WHERE normalized_query = lower(trim(p_query));
  END IF;

  WITH grouped AS (
    SELECT
      outcomes.normalized_query,
      outcomes.model_version,
      count(*) FILTER (WHERE outcomes.searched)::INTEGER AS searches,
      count(*) FILTER (WHERE outcomes.succeeded)::INTEGER AS successes,
      count(*) FILTER (
        WHERE outcomes.clicked AND NOT outcomes.refined AND NOT outcomes.rejected
      )::INTEGER AS satisfied,
      count(*) FILTER (WHERE outcomes.refined)::INTEGER AS refinements,
      count(*) FILTER (WHERE outcomes.zero_results)::INTEGER AS zero_results,
      count(*) FILTER (WHERE outcomes.rejected)::INTEGER AS rejected,
      count(*) FILTER (WHERE outcomes.abandoned)::INTEGER AS abandoned,
      avg(outcomes.first_click_ms) FILTER (
        WHERE outcomes.first_click_ms IS NOT NULL
      ) AS avg_click_ms
    FROM public.query_request_outcomes_v2 outcomes
    WHERE (
      p_query IS NULL
      OR outcomes.normalized_query = lower(trim(p_query))
    )
      AND outcomes.searched
    GROUP BY outcomes.normalized_query, outcomes.model_version
  )
  INSERT INTO public.query_intelligence_agg_v2 (
    normalized_query,
    model_version,
    searches,
    successful_searches,
    satisfied_searches,
    refinements,
    zero_results,
    negative_feedback,
    abandonments,
    avg_time_to_click_ms,
    search_quality_score,
    confidence,
    updated_at
  )
  SELECT
    grouped.normalized_query,
    grouped.model_version,
    grouped.searches,
    grouped.successes,
    grouped.satisfied,
    grouped.refinements,
    grouped.zero_results,
    grouped.rejected,
    grouped.abandoned,
    grouped.avg_click_ms,
    quality.score,
    quality.confidence,
    now()
  FROM grouped
  CROSS JOIN LATERAL public.compute_query_quality_v2(
    grouped.searches,
    grouped.satisfied,
    grouped.zero_results,
    grouped.refinements,
    grouped.rejected
  ) quality
  ;
END;
$$;

-- Convert a trustworthy analytics event into one idempotent request outcome.
CREATE OR REPLACE FUNCTION public.ingest_query_outcome_v2()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  q TEXT;
  req TEXT;
  version TEXT;
  click_ms INTEGER;
  is_relevant BOOLEAN;
BEGIN
  q := lower(trim(coalesce(
    NEW.event_data->>'query',
    NEW.event_data->>'original_query',
    ''
  )));
  req := nullif(coalesce(
    NEW.event_data->>'request_id',
    NEW.event_data->>'result_set_id'
  ), '');
  version := coalesce(nullif(NEW.event_data->>'ranker_version', ''), 'v2');
  click_ms := CASE
    WHEN coalesce(NEW.event_data->>'time_to_click_ms', '') ~ '^\d+$'
      THEN (NEW.event_data->>'time_to_click_ms')::INTEGER
    ELSE NULL
  END;
  is_relevant := NEW.event_type IN (
    'search_started',
    'search_results',
    'search_success',
    'card_click',
    'recommendation_click',
    'rerun_edited_query',
    'first_refinement',
    'search_no_result_shown',
    'search_failure',
    'feedback_submitted',
    'recommendation_rejected',
    'search_outcome'
  );

  IF NOT is_relevant OR q = '' OR req IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.query_request_outcomes_v2 (
    request_id,
    normalized_query,
    model_version,
    searched,
    succeeded,
    clicked,
    refined,
    zero_results,
    rejected,
    abandoned,
    first_click_ms,
    updated_at
  ) VALUES (
    req,
    q,
    version,
    NEW.event_type = 'search_started',
    NEW.event_type IN ('search_results', 'search_success'),
    NEW.event_type IN ('card_click', 'recommendation_click'),
    NEW.event_type IN ('rerun_edited_query', 'first_refinement'),
    NEW.event_type IN ('search_no_result_shown', 'search_failure'),
    NEW.event_type IN ('feedback_submitted', 'recommendation_rejected'),
    NEW.event_type = 'search_outcome'
      AND NEW.event_data->>'outcome' = 'abandoned',
    click_ms,
    now()
  )
  ON CONFLICT (request_id, normalized_query, model_version) DO UPDATE SET
    searched = public.query_request_outcomes_v2.searched OR EXCLUDED.searched,
    succeeded = public.query_request_outcomes_v2.succeeded OR EXCLUDED.succeeded,
    clicked = public.query_request_outcomes_v2.clicked OR EXCLUDED.clicked,
    refined = public.query_request_outcomes_v2.refined OR EXCLUDED.refined,
    zero_results = public.query_request_outcomes_v2.zero_results OR EXCLUDED.zero_results,
    rejected = public.query_request_outcomes_v2.rejected OR EXCLUDED.rejected,
    abandoned = public.query_request_outcomes_v2.abandoned OR EXCLUDED.abandoned,
    first_click_ms = CASE
      WHEN public.query_request_outcomes_v2.first_click_ms IS NULL THEN EXCLUDED.first_click_ms
      WHEN EXCLUDED.first_click_ms IS NULL THEN public.query_request_outcomes_v2.first_click_ms
      ELSE LEAST(public.query_request_outcomes_v2.first_click_ms, EXCLUDED.first_click_ms)
    END,
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ingest_query_outcome_v2 ON public.analytics_events;
CREATE TRIGGER trg_ingest_query_outcome_v2
AFTER INSERT ON public.analytics_events
FOR EACH ROW EXECUTE FUNCTION public.ingest_query_outcome_v2();

-- Reproducible backfill from only attributable legacy events.
INSERT INTO public.query_request_outcomes_v2 (
  request_id,
  normalized_query,
  model_version,
  searched,
  succeeded,
  clicked,
  refined,
  zero_results,
  rejected,
  abandoned,
  first_click_ms,
  created_at,
  updated_at
)
SELECT
  coalesce(event_data->>'request_id', event_data->>'result_set_id'),
  lower(trim(coalesce(event_data->>'query', event_data->>'original_query'))),
  event_data->>'ranker_version',
  bool_or(event_type = 'search_started'),
  bool_or(event_type IN ('search_results', 'search_success')),
  bool_or(event_type IN ('card_click', 'recommendation_click')),
  bool_or(event_type IN ('rerun_edited_query', 'first_refinement')),
  bool_or(event_type IN ('search_no_result_shown', 'search_failure')),
  bool_or(event_type IN ('feedback_submitted', 'recommendation_rejected')),
  bool_or(event_type = 'search_outcome' AND event_data->>'outcome' = 'abandoned'),
  min(
    CASE
      WHEN coalesce(event_data->>'time_to_click_ms', '') ~ '^\d+$'
        THEN (event_data->>'time_to_click_ms')::INTEGER
      ELSE NULL
    END
  ),
  min(created_at),
  max(created_at)
FROM public.analytics_events
WHERE nullif(coalesce(event_data->>'request_id', event_data->>'result_set_id'), '') IS NOT NULL
  AND nullif(event_data->>'ranker_version', '') IS NOT NULL
  AND nullif(trim(coalesce(event_data->>'query', event_data->>'original_query', '')), '') IS NOT NULL
GROUP BY
  coalesce(event_data->>'request_id', event_data->>'result_set_id'),
  lower(trim(coalesce(event_data->>'query', event_data->>'original_query'))),
  event_data->>'ranker_version'
ON CONFLICT (request_id, normalized_query, model_version) DO NOTHING;

SELECT public.refresh_query_intelligence_v2();

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('refresh-query-intelligence-v2');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  PERFORM cron.schedule(
    'refresh-query-intelligence-v2',
    '*/5 * * * *',
    'SELECT public.refresh_query_intelligence_v2();'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.compute_query_quality_v2(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_query_intelligence_v2(TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ingest_query_outcome_v2()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_query_quality_v2(INTEGER, INTEGER, INTEGER, INTEGER, INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.refresh_query_intelligence_v2(TEXT)
  TO service_role;
