-- Harden apply_query_signal so it cannot be called directly by anon/authenticated clients.
-- The function is only meant to be invoked by trusted service-role flows and internal triggers.

CREATE OR REPLACE FUNCTION public.apply_query_signal(
  p_event_type TEXT,
  p_query TEXT,
  p_session_id TEXT,
  p_user_id UUID,
  p_time_to_click_ms INTEGER,
  p_metadata JSONB
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  normalized TEXT;
  dedupe TEXT;
  agg RECORD;
  quality RECORD;
BEGIN
  IF current_setting('request.jwt.claim.role', true) IS DISTINCT FROM 'service_role'
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Forbidden: service_role required';
  END IF;

  normalized := lower(trim(coalesce(p_query, '')));
  IF normalized = '' THEN
    RETURN;
  END IF;

  dedupe := coalesce(
    nullif(p_metadata->>'source_event_id', ''),
    md5(
      coalesce(p_session_id, 'anon')
      || '|'
      || p_event_type
      || '|'
      || normalized
      || '|'
      || coalesce(p_metadata::text, '{}')
    )
  );

  INSERT INTO public.query_signal_events (
    normalized_query, event_type, session_id, user_id, time_to_click_ms, metadata, dedupe_hash
  ) VALUES (
    normalized, p_event_type, p_session_id, p_user_id, p_time_to_click_ms, coalesce(p_metadata, '{}'::jsonb), dedupe
  ) ON CONFLICT (dedupe_hash) DO NOTHING;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  INSERT INTO public.query_intelligence_agg (normalized_query)
  VALUES (normalized)
  ON CONFLICT (normalized_query) DO NOTHING;

  UPDATE public.query_intelligence_agg
  SET
    total_searches = total_searches + CASE WHEN p_event_type = 'search_start' THEN 1 ELSE 0 END,
    successful_searches = successful_searches + CASE WHEN p_event_type = 'search_success' THEN 1 ELSE 0 END,
    result_clicks = result_clicks + CASE WHEN p_event_type = 'result_click' THEN 1 ELSE 0 END,
    refinements = refinements + CASE WHEN p_event_type = 'refinement' THEN 1 ELSE 0 END,
    no_results = no_results + CASE WHEN p_event_type = 'no_result' THEN 1 ELSE 0 END,
    recoveries = recoveries + CASE WHEN p_event_type = 'recovery_success' THEN 1 ELSE 0 END,
    feedback_reports = feedback_reports + CASE WHEN p_event_type = 'feedback_submitted' THEN 1 ELSE 0 END,
    avg_time_to_click_ms = CASE
      WHEN p_event_type = 'result_click' AND p_time_to_click_ms IS NOT NULL THEN
        CASE
          WHEN avg_time_to_click_ms IS NULL THEN p_time_to_click_ms::NUMERIC
          ELSE ROUND((avg_time_to_click_ms * 0.7) + (p_time_to_click_ms::NUMERIC * 0.3), 2)
        END
      ELSE avg_time_to_click_ms
    END,
    sample_size = sample_size + 1,
    updated_at = now()
  WHERE normalized_query = normalized;

  SELECT * INTO agg
  FROM public.query_intelligence_agg
  WHERE normalized_query = normalized;

  IF p_event_type IN ('search_success', 'no_result', 'recovery_success', 'feedback_submitted')
     OR (agg.sample_size % 10 = 0) THEN
    SELECT * INTO quality
    FROM public.compute_query_quality(
      agg.total_searches,
      agg.successful_searches,
      agg.result_clicks,
      agg.refinements,
      agg.no_results,
      agg.recoveries,
      agg.feedback_reports,
      agg.avg_time_to_click_ms
    );

    UPDATE public.query_intelligence_agg
    SET
      search_quality_score = quality.score,
      confidence = quality.confidence,
      updated_at = now()
    WHERE normalized_query = normalized;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_query_signal(TEXT, TEXT, TEXT, UUID, INTEGER, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_query_signal(TEXT, TEXT, TEXT, UUID, INTEGER, JSONB) TO service_role;
