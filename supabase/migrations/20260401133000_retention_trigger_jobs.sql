-- Automated retention trigger generation jobs
ALTER TABLE public.retention_triggers
  ADD COLUMN IF NOT EXISTS payload_hash TEXT,
  ADD COLUMN IF NOT EXISTS dedupe_window_start DATE;

UPDATE public.retention_triggers
SET
  payload_hash = COALESCE(payload_hash, md5(COALESCE(payload::text, '{}'))),
  dedupe_window_start = COALESCE(dedupe_window_start, created_at::date)
WHERE payload_hash IS NULL OR dedupe_window_start IS NULL;

ALTER TABLE public.retention_triggers
  ALTER COLUMN payload_hash SET DEFAULT md5('{}'),
  ALTER COLUMN dedupe_window_start SET DEFAULT CURRENT_DATE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_retention_trigger_daily_dedupe
  ON public.retention_triggers (user_id, trigger_type, payload_hash, dedupe_window_start);

CREATE OR REPLACE FUNCTION public.generate_new_card_match_triggers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  WITH recent_cards AS (
    SELECT DISTINCT lower(card_name) AS card_name
    FROM public.price_snapshots
    WHERE recorded_at >= now() - interval '1 day'
  ),
  candidates AS (
    SELECT
      s.user_id,
      'new_card_match'::TEXT AS trigger_type,
      jsonb_build_object(
        'natural_query', s.natural_query,
        'matched_card', c.name
      ) AS payload,
      md5(s.user_id::text || '|new_card_match|' || c.name || '|' || current_date::text) AS payload_hash,
      current_date AS dedupe_window_start
    FROM public.saved_searches s
    JOIN public.cards c
      ON lower(c.name) LIKE '%' || lower(split_part(s.natural_query, ' ', 1)) || '%'
    JOIN recent_cards rc ON rc.card_name = lower(c.name)
    WHERE length(trim(s.natural_query)) >= 3
  )
  INSERT INTO public.retention_triggers (user_id, trigger_type, payload, payload_hash, dedupe_window_start)
  SELECT user_id, trigger_type, payload, payload_hash, dedupe_window_start
  FROM candidates
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_deck_gap_detected_triggers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  WITH deck_colors AS (
    SELECT d.user_id, d.id AS deck_id, d.name AS deck_name, d.color_identity
    FROM public.decks d
    WHERE d.user_id IS NOT NULL
  ),
  collection_summary AS (
    SELECT user_id, COUNT(*) AS owned_unique
    FROM public.collection_cards
    GROUP BY user_id
  ),
  candidates AS (
    SELECT
      dc.user_id,
      'deck_gap_detected'::TEXT AS trigger_type,
      jsonb_build_object(
        'deck_id', dc.deck_id,
        'deck_name', dc.deck_name,
        'owned_unique_cards', COALESCE(cs.owned_unique, 0)
      ) AS payload,
      md5(dc.user_id::text || '|deck_gap_detected|' || dc.deck_id::text || '|' || current_date::text) AS payload_hash,
      current_date AS dedupe_window_start
    FROM deck_colors dc
    LEFT JOIN collection_summary cs ON cs.user_id = dc.user_id
    WHERE COALESCE(cs.owned_unique, 0) < 25
  )
  INSERT INTO public.retention_triggers (user_id, trigger_type, payload, payload_hash, dedupe_window_start)
  SELECT user_id, trigger_type, payload, payload_hash, dedupe_window_start
  FROM candidates
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_price_change_detected_triggers()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  inserted_count INTEGER := 0;
BEGIN
  WITH latest AS (
    SELECT card_name, MAX(recorded_at) AS latest_at
    FROM public.price_snapshots
    GROUP BY card_name
  ),
  previous AS (
    SELECT ps.card_name, MAX(ps.recorded_at) AS previous_at
    FROM public.price_snapshots ps
    JOIN latest l ON l.card_name = ps.card_name
    WHERE ps.recorded_at < l.latest_at
    GROUP BY ps.card_name
  ),
  deltas AS (
    SELECT
      l.card_name,
      p1.price_usd AS latest_price,
      p0.price_usd AS previous_price,
      CASE
        WHEN p0.price_usd IS NULL OR p0.price_usd = 0 OR p1.price_usd IS NULL THEN 0
        ELSE ((p1.price_usd - p0.price_usd) / p0.price_usd) * 100
      END AS pct_change
    FROM latest l
    JOIN previous p ON p.card_name = l.card_name
    JOIN public.price_snapshots p1 ON p1.card_name = l.card_name AND p1.recorded_at = l.latest_at
    JOIN public.price_snapshots p0 ON p0.card_name = p.card_name AND p0.recorded_at = p.previous_at
  ),
  candidates AS (
    SELECT
      cc.user_id,
      'price_change_detected'::TEXT AS trigger_type,
      jsonb_build_object(
        'card_name', d.card_name,
        'pct_change', ROUND(d.pct_change::numeric, 2),
        'latest_price', d.latest_price,
        'previous_price', d.previous_price
      ) AS payload,
      md5(cc.user_id::text || '|price_change_detected|' || d.card_name || '|' || current_date::text) AS payload_hash,
      current_date AS dedupe_window_start
    FROM deltas d
    JOIN public.collection_cards cc ON lower(cc.card_name) = lower(d.card_name)
    WHERE ABS(d.pct_change) >= 8
  )
  INSERT INTO public.retention_triggers (user_id, trigger_type, payload, payload_hash, dedupe_window_start)
  SELECT user_id, trigger_type, payload, payload_hash, dedupe_window_start
  FROM candidates
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
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
BEGIN
  c_new := public.generate_new_card_match_triggers();
  c_gap := public.generate_deck_gap_detected_triggers();
  c_price := public.generate_price_change_detected_triggers();

  RETURN jsonb_build_object(
    'new_card_match', c_new,
    'deck_gap_detected', c_gap,
    'price_change_detected', c_price,
    'ran_at', now()
  );
END;
$$;
