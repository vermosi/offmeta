-- Production hardening follow-ups: dedupe correctness, trigger load, and retention job safety

-- Normalize existing saved_search_updated rows to deterministic daily hashes.
UPDATE public.retention_triggers
SET
  dedupe_window_start = COALESCE(dedupe_window_start, created_at::date),
  payload_hash = md5(
    user_id::text
    || '|saved_search_updated|'
    || lower(coalesce(payload->>'natural_query', ''))
    || '|'
    || COALESCE(dedupe_window_start, created_at::date)::text
  )
WHERE trigger_type = 'saved_search_updated';

-- Precheck for duplicate keys before enforcing unique daily dedupe index.
DO $$
DECLARE
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO duplicate_count
  FROM (
    SELECT user_id, trigger_type, payload_hash, dedupe_window_start
    FROM public.retention_triggers
    GROUP BY 1, 2, 3, 4
    HAVING COUNT(*) > 1
  ) dupes;

  IF duplicate_count > 0 THEN
    RAISE EXCEPTION 'Cannot create/validate retention dedupe uniqueness: % duplicate key groups detected', duplicate_count;
  END IF;
END;
$$;

-- Supporting indexes for retention generator workloads.
CREATE INDEX IF NOT EXISTS idx_price_snapshots_card_recorded
  ON public.price_snapshots (card_name, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_collection_cards_user
  ON public.collection_cards (user_id);
CREATE INDEX IF NOT EXISTS idx_collection_cards_lower_name
  ON public.collection_cards (lower(card_name));
CREATE INDEX IF NOT EXISTS idx_cards_lower_name
  ON public.cards (lower(name));
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_query
  ON public.saved_searches (user_id, natural_query);

-- Replace minute-bucket dedupe with source-event dedupe when available.
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

  -- Soften synchronous trigger work: recompute quality on key events or every 10 samples.
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
  enriched_data JSONB;
BEGIN
  evt := NEW.event_type;
  q := NEW.event_data->>'query';
  ttc := NULLIF(NEW.event_data->>'time_to_click_ms', '')::INTEGER;
  enriched_data := coalesce(NEW.event_data, '{}'::jsonb)
    || jsonb_build_object('source_event_id', NEW.id::text);

  IF evt = 'first_search_start' THEN
    PERFORM public.apply_query_signal('search_start', q, NEW.session_id, NULL, NULL, enriched_data);
  ELSIF evt = 'first_search_success' OR evt = 'search_results' THEN
    PERFORM public.apply_query_signal('search_success', q, NEW.session_id, NULL, NULL, enriched_data);
  ELSIF evt = 'first_result_click' OR evt = 'card_click' THEN
    PERFORM public.apply_query_signal('result_click', q, NEW.session_id, NULL, ttc, enriched_data);
  ELSIF evt = 'first_refinement' OR evt = 'rerun_edited_query' THEN
    PERFORM public.apply_query_signal('refinement', q, NEW.session_id, NULL, NULL, enriched_data);
  ELSIF evt = 'search_no_result_shown' OR evt = 'search_failure' THEN
    PERFORM public.apply_query_signal('no_result', q, NEW.session_id, NULL, NULL, enriched_data);
  ELSIF evt = 'search_recovery_success' THEN
    PERFORM public.apply_query_signal('recovery_success', q, NEW.session_id, NULL, NULL, enriched_data);
  ELSIF evt = 'feedback_submitted' THEN
    PERFORM public.apply_query_signal('feedback_submitted', q, NEW.session_id, NULL, NULL, enriched_data);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.run_retention_trigger_jobs()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  c_new INTEGER;
  c_gap INTEGER;
  c_price INTEGER;
  lock_key BIGINT := hashtextextended('run_retention_trigger_jobs', 0);
BEGIN
  IF NOT pg_try_advisory_lock(lock_key) THEN
    RETURN jsonb_build_object(
      'skipped', true,
      'reason', 'job_already_running',
      'ran_at', now()
    );
  END IF;

  BEGIN
    c_new := public.generate_new_card_match_triggers();
    c_gap := public.generate_deck_gap_detected_triggers();
    c_price := public.generate_price_change_detected_triggers();

    PERFORM pg_advisory_unlock(lock_key);

    RETURN jsonb_build_object(
      'new_card_match', c_new,
      'deck_gap_detected', c_gap,
      'price_change_detected', c_price,
      'ran_at', now()
    );
  EXCEPTION WHEN OTHERS THEN
    PERFORM pg_advisory_unlock(lock_key);
    RAISE;
  END;
END;
$$;
