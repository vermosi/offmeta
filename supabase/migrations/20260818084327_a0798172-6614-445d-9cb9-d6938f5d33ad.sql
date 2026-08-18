DROP PROCEDURE IF EXISTS public.classify_card_ontology_batched(integer);

CREATE TABLE IF NOT EXISTS public.ontology_classify_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active boolean NOT NULL DEFAULT false,
  cursor_oracle_id text,
  cards_done integer NOT NULL DEFAULT 0,
  tags_done integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.ontology_classify_state TO service_role;
ALTER TABLE public.ontology_classify_state ENABLE ROW LEVEL SECURITY;

INSERT INTO public.ontology_classify_state (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Begins a new classification pass; the step routine does the actual work.
CREATE OR REPLACE FUNCTION public.classify_card_ontology_start()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.ontology_classify_state
  SET active = true,
      cursor_oracle_id = NULL,
      cards_done = 0,
      tags_done = 0,
      started_at = now(),
      finished_at = NULL,
      updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object('started', true, 'at', now());
END;
$function$;

-- Processes one bounded chunk of cards. Each cron invocation is its own
-- transaction, so progress is durable and the pass can never hit the
-- statement timeout.
CREATE OR REPLACE FUNCTION public.classify_card_ontology_step(p_batch_size integer DEFAULT 4000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '300s'
AS $function$
DECLARE
  v_state public.ontology_classify_state%ROWTYPE;
  v_size integer := greatest(coalesce(p_batch_size, 4000), 100);
  v_batch_cards integer := 0;
  v_batch_tags integer := 0;
  v_next_cursor text;
BEGIN
  -- Single-flight: a concurrent run exits instead of duplicating work.
  IF NOT pg_try_advisory_xact_lock(hashtext('classify_card_ontology')) THEN
    RETURN jsonb_build_object('skipped', 'locked');
  END IF;

  SELECT * INTO v_state FROM public.ontology_classify_state WHERE id = 1 FOR UPDATE;

  IF NOT FOUND OR NOT v_state.active THEN
    RETURN jsonb_build_object('skipped', 'idle');
  END IF;

  CREATE TEMP TABLE _ontology_target ON COMMIT DROP AS
    SELECT
      c.oracle_id,
      lower(coalesce(c.oracle_text, '') || E'\n' || coalesce(c.type_line, '')) AS txt,
      lower(coalesce(c.type_line, '')) AS type_line,
      coalesce(c.cmc, 0)::numeric AS cmc,
      coalesce(array_length(c.colors, 1), 0) AS color_count
    FROM public.cards c
    WHERE v_state.cursor_oracle_id IS NULL OR c.oracle_id::text > v_state.cursor_oracle_id
    ORDER BY c.oracle_id
    LIMIT v_size;

  SELECT count(*), max(oracle_id::text) INTO v_batch_cards, v_next_cursor FROM _ontology_target;

  IF v_batch_cards > 0 THEN
    CREATE TEMP TABLE _ontology_matches ON COMMIT DROP AS
      SELECT
        t.oracle_id,
        g.tag_key,
        g.dimension,
        m.sig AS matched_signature
      FROM _ontology_target t
      JOIN public.ontology_tags g ON g.is_active
      CROSS JOIN LATERAL (
        SELECT s AS sig
        FROM unnest(
          CASE WHEN cardinality(g.signatures) = 0 THEN ARRAY['^'] ELSE g.signatures END
        ) AS s
        WHERE t.txt ~ s
        LIMIT 1
      ) m
      WHERE (g.type_pattern IS NULL OR t.type_line ~ g.type_pattern)
        AND (g.min_cmc IS NULL OR t.cmc >= g.min_cmc)
        AND (g.max_cmc IS NULL OR t.cmc <= g.max_cmc)
        AND (g.max_colors IS NULL OR t.color_count <= g.max_colors)
        AND (g.min_colors IS NULL OR t.color_count >= g.min_colors)
        AND NOT EXISTS (
          SELECT 1 FROM unnest(g.exclusions) AS e WHERE t.txt ~ e
        );

    DELETE FROM public.card_ontology co
    USING _ontology_target t
    WHERE co.oracle_id = t.oracle_id;

    INSERT INTO public.card_ontology (oracle_id, tag_key, dimension, matched_signature)
    SELECT oracle_id, tag_key, dimension, matched_signature
    FROM _ontology_matches;

    GET DIAGNOSTICS v_batch_tags = ROW_COUNT;
  END IF;

  UPDATE public.ontology_classify_state
  SET cursor_oracle_id = coalesce(v_next_cursor, cursor_oracle_id),
      cards_done = cards_done + v_batch_cards,
      tags_done = tags_done + v_batch_tags,
      active = (v_batch_cards = v_size),
      finished_at = CASE WHEN v_batch_cards < v_size THEN now() ELSE NULL END,
      updated_at = now()
  WHERE id = 1;

  RETURN jsonb_build_object(
    'batch_cards', v_batch_cards,
    'batch_tags', v_batch_tags,
    'done', v_batch_cards < v_size
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.classify_card_ontology_start() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.classify_card_ontology_step(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.classify_card_ontology_start() TO service_role;
GRANT EXECUTE ON FUNCTION public.classify_card_ontology_step(integer) TO service_role;