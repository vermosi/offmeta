ALTER TABLE public.translation_rules
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_state text NOT NULL DEFAULT 'verified',
  ADD COLUMN IF NOT EXISTS last_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_result_count integer,
  ADD COLUMN IF NOT EXISTS failure_count integer NOT NULL DEFAULT 0;

ALTER TABLE public.translation_rules
  DROP CONSTRAINT IF EXISTS translation_rules_verification_state_check;
ALTER TABLE public.translation_rules
  ADD CONSTRAINT translation_rules_verification_state_check
  CHECK (verification_state IN ('probation', 'verified', 'rejected'));

CREATE INDEX IF NOT EXISTS idx_translation_rules_probation
  ON public.translation_rules (verification_state, created_at)
  WHERE archived_at IS NULL AND auto_generated = true;

CREATE TABLE IF NOT EXISTS public.self_heal_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  candidates integer NOT NULL DEFAULT 0,
  repaired integer NOT NULL DEFAULT 0,
  verified integer NOT NULL DEFAULT 0,
  rolled_back integer NOT NULL DEFAULT 0,
  skipped integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'running',
  details jsonb NOT NULL DEFAULT '[]'::jsonb
);

GRANT SELECT ON public.self_heal_runs TO authenticated;
GRANT ALL ON public.self_heal_runs TO service_role;
ALTER TABLE public.self_heal_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view self heal runs" ON public.self_heal_runs;
CREATE POLICY "Admins can view self heal runs"
  ON public.self_heal_runs FOR SELECT TO authenticated
  USING (public.has_role('admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_self_heal_runs_started ON public.self_heal_runs (started_at DESC);

CREATE OR REPLACE FUNCTION public.get_search_failure_candidates(
  since_date timestamptz,
  min_frequency integer DEFAULT 1,
  max_results integer DEFAULT 20
)
RETURNS TABLE (query text, frequency bigint, last_translation text, sources text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH combined AS (
    SELECT lower(btrim(natural_language_query)) AS q,
           coalesce(translated_query, '') AS t,
           'translation_logs'::text AS src,
           created_at
    FROM public.translation_logs
    WHERE result_count = 0
      AND created_at >= since_date
      AND natural_language_query IS NOT NULL
    UNION ALL
    SELECT lower(btrim(event_data->>'query')) AS q,
           coalesce(event_data->>'translated_query', '') AS t,
           'analytics_events'::text AS src,
           created_at
    FROM public.analytics_events
    WHERE event_type IN ('search_failure', 'search_no_result_shown')
      AND created_at >= since_date
      AND coalesce(event_data->>'query', '') <> ''
      AND coalesce(event_data->>'is_internal', 'false') <> 'true'
  ), filtered AS (
    SELECT * FROM combined
    WHERE q <> ''
      AND length(q) BETWEEN 3 AND 120
      AND q NOT LIKE '%warmup%'
      AND q NOT LIKE '%ping%'
  )
  SELECT q AS query,
         count(*) AS frequency,
         (array_agg(t ORDER BY created_at DESC))[1] AS last_translation,
         string_agg(DISTINCT src, ',') AS sources
  FROM filtered
  GROUP BY q
  HAVING count(*) >= min_frequency
  ORDER BY count(*) DESC, max(created_at) DESC
  LIMIT max_results;
$$;

REVOKE ALL ON FUNCTION public.get_search_failure_candidates(timestamptz, integer, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_search_failure_candidates(timestamptz, integer, integer) TO service_role;