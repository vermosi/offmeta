-- Harden get_query_intelligence so it cannot leak per-query analytics to public callers.

CREATE OR REPLACE FUNCTION public.get_query_intelligence(p_query TEXT)
RETURNS TABLE (
  normalized_query TEXT,
  search_quality_score NUMERIC,
  confidence NUMERIC,
  total_searches INTEGER,
  successful_searches INTEGER,
  result_clicks INTEGER,
  refinements INTEGER,
  no_results INTEGER,
  recoveries INTEGER,
  feedback_reports INTEGER,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    q.normalized_query,
    q.search_quality_score,
    q.confidence,
    q.total_searches,
    q.successful_searches,
    q.result_clicks,
    q.refinements,
    q.no_results,
    q.recoveries,
    q.feedback_reports,
    q.updated_at
  FROM public.query_intelligence_agg q
  WHERE q.normalized_query = lower(trim(coalesce(p_query, '')))
    AND (
      current_setting('request.jwt.claim.role', true) = 'service_role'
      OR public.has_role(auth.uid(), 'admin')
    )
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_query_intelligence(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_query_intelligence(TEXT) TO service_role;
