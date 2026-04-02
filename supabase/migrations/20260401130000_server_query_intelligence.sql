-- Server-backed query intelligence aggregate and signal log
CREATE TABLE IF NOT EXISTS public.query_signal_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  normalized_query TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'search_start',
      'search_success',
      'result_click',
      'refinement',
      'no_result',
      'recovery_success',
      'feedback_submitted'
    )
  ),
  session_id TEXT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  time_to_click_ms INTEGER NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT query_signal_events_ttc_non_negative CHECK (
    time_to_click_ms IS NULL OR time_to_click_ms >= 0
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_query_signal_events_dedupe
  ON public.query_signal_events (dedupe_hash);
CREATE INDEX IF NOT EXISTS idx_query_signal_events_query_created
  ON public.query_signal_events (normalized_query, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_signal_events_event_type
  ON public.query_signal_events (event_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.query_intelligence_agg (
  normalized_query TEXT PRIMARY KEY,
  total_searches INTEGER NOT NULL DEFAULT 0,
  successful_searches INTEGER NOT NULL DEFAULT 0,
  result_clicks INTEGER NOT NULL DEFAULT 0,
  refinements INTEGER NOT NULL DEFAULT 0,
  no_results INTEGER NOT NULL DEFAULT 0,
  recoveries INTEGER NOT NULL DEFAULT 0,
  feedback_reports INTEGER NOT NULL DEFAULT 0,
  avg_time_to_click_ms NUMERIC(10,2) NULL,
  search_quality_score NUMERIC(6,4) NOT NULL DEFAULT 0,
  confidence NUMERIC(6,4) NOT NULL DEFAULT 0,
  sample_size INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_query_intelligence_quality
  ON public.query_intelligence_agg (search_quality_score DESC, sample_size DESC);

ALTER TABLE public.query_signal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.query_intelligence_agg ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage query_signal_events" ON public.query_signal_events;
CREATE POLICY "Service role can manage query_signal_events"
  ON public.query_signal_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can read query_signal_events" ON public.query_signal_events;
CREATE POLICY "Admins can read query_signal_events"
  ON public.query_signal_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Service role can manage query_intelligence_agg" ON public.query_intelligence_agg;
CREATE POLICY "Service role can manage query_intelligence_agg"
  ON public.query_intelligence_agg FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can read query_intelligence_agg" ON public.query_intelligence_agg;
CREATE POLICY "Admins can read query_intelligence_agg"
  ON public.query_intelligence_agg FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.compute_query_quality(
  total_searches INTEGER,
  successful_searches INTEGER,
  result_clicks INTEGER,
  refinements INTEGER,
  no_results INTEGER,
  recoveries INTEGER,
  feedback_reports INTEGER,
  avg_time_to_click_ms NUMERIC
) RETURNS TABLE(score NUMERIC, confidence NUMERIC)
LANGUAGE plpgsql
AS $$
DECLARE
  click_rate NUMERIC := 0;
  success_rate NUMERIC := 0;
  refinement_rate NUMERIC := 0;
  no_result_rate NUMERIC := 0;
  recovery_rate NUMERIC := 0;
  dissatisfaction_rate NUMERIC := 0;
  ttc_score NUMERIC := 0;
  base_score NUMERIC := 0;
  sample_conf NUMERIC := 0;
BEGIN
  IF total_searches <= 0 THEN
    RETURN QUERY SELECT 0::NUMERIC, 0::NUMERIC;
    RETURN;
  END IF;

  click_rate := LEAST(1, result_clicks::NUMERIC / total_searches::NUMERIC);
  success_rate := LEAST(1, successful_searches::NUMERIC / total_searches::NUMERIC);
  refinement_rate := LEAST(1, refinements::NUMERIC / total_searches::NUMERIC);
  no_result_rate := LEAST(1, no_results::NUMERIC / total_searches::NUMERIC);
  recovery_rate := CASE
    WHEN no_results > 0 THEN LEAST(1, recoveries::NUMERIC / no_results::NUMERIC)
    ELSE 0
  END;
  dissatisfaction_rate := LEAST(1, (feedback_reports + refinements + no_results)::NUMERIC / GREATEST(total_searches, 1)::NUMERIC);

  ttc_score := CASE
    WHEN avg_time_to_click_ms IS NULL THEN 0.5
    ELSE GREATEST(0, LEAST(1, 1 - (avg_time_to_click_ms / 4000::NUMERIC)))
  END;

  -- Anti-gaming: cap positive impact of click/recovery terms
  base_score :=
      (0.28 * LEAST(click_rate, 0.85))
    + (0.24 * success_rate)
    + (0.14 * ttc_score)
    + (0.12 * LEAST(recovery_rate, 0.75))
    + (0.10 * (1 - LEAST(refinement_rate, 0.9)))
    + (0.12 * (1 - LEAST(dissatisfaction_rate, 0.95)));

  sample_conf := LEAST(1, LN(1 + total_searches)::NUMERIC / LN(51)::NUMERIC);

  RETURN QUERY SELECT ROUND(base_score, 4), ROUND(sample_conf, 4);
END;
$$;

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
  normalized := lower(trim(coalesce(p_query, '')));
  IF normalized = '' THEN
    RETURN;
  END IF;

  dedupe := md5(coalesce(p_session_id, 'anon') || '|' || p_event_type || '|' || normalized || '|' || to_char(now(), 'YYYYMMDDHH24MI'));

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
END;
$$;

CREATE OR REPLACE FUNCTION public.ingest_query_signal_from_analytics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  evt TEXT;
  q TEXT;
  ttc INTEGER;
BEGIN
  evt := NEW.event_type;
  q := NEW.event_data->>'query';
  ttc := NULLIF(NEW.event_data->>'time_to_click_ms', '')::INTEGER;

  IF evt = 'first_search_start' THEN
    PERFORM public.apply_query_signal('search_start', q, NEW.session_id, NULL, NULL, NEW.event_data);
  ELSIF evt = 'first_search_success' OR evt = 'search_results' THEN
    PERFORM public.apply_query_signal('search_success', q, NEW.session_id, NULL, NULL, NEW.event_data);
  ELSIF evt = 'first_result_click' OR evt = 'card_click' THEN
    PERFORM public.apply_query_signal('result_click', q, NEW.session_id, NULL, ttc, NEW.event_data);
  ELSIF evt = 'first_refinement' OR evt = 'rerun_edited_query' THEN
    PERFORM public.apply_query_signal('refinement', q, NEW.session_id, NULL, NULL, NEW.event_data);
  ELSIF evt = 'search_no_result_shown' OR evt = 'search_failure' THEN
    PERFORM public.apply_query_signal('no_result', q, NEW.session_id, NULL, NULL, NEW.event_data);
  ELSIF evt = 'search_recovery_success' THEN
    PERFORM public.apply_query_signal('recovery_success', q, NEW.session_id, NULL, NULL, NEW.event_data);
  ELSIF evt = 'feedback_submitted' THEN
    PERFORM public.apply_query_signal('feedback_submitted', q, NEW.session_id, NULL, NULL, NEW.event_data);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ingest_query_signal_from_analytics ON public.analytics_events;
CREATE TRIGGER trg_ingest_query_signal_from_analytics
AFTER INSERT ON public.analytics_events
FOR EACH ROW
EXECUTE FUNCTION public.ingest_query_signal_from_analytics();

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
  LIMIT 1;
$$;
