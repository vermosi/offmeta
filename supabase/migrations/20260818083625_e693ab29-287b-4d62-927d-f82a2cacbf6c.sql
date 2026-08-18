CREATE OR REPLACE PROCEDURE public.classify_card_ontology_batched(
  p_batch_size integer DEFAULT 4000
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $procedure$
DECLARE
  v_last_oracle uuid := NULL;
  v_batch_cards integer := 0;
  v_total_cards integer := 0;
  v_total_tags integer := 0;
  v_batch_tags integer := 0;
  v_size integer := greatest(coalesce(p_batch_size, 4000), 100);
BEGIN
  LOOP
    -- Bounded slice of cards, ordered so the cursor always moves forward.
    CREATE TEMP TABLE _ontology_target AS
      SELECT
        c.oracle_id,
        lower(coalesce(c.oracle_text, '') || E'\n' || coalesce(c.type_line, '')) AS txt,
        lower(coalesce(c.type_line, '')) AS type_line,
        coalesce(c.cmc, 0)::numeric AS cmc,
        coalesce(array_length(c.colors, 1), 0) AS color_count
      FROM public.cards c
      WHERE v_last_oracle IS NULL OR c.oracle_id > v_last_oracle
      ORDER BY c.oracle_id
      LIMIT v_size;

    SELECT count(*), max(oracle_id) INTO v_batch_cards, v_last_oracle FROM _ontology_target;

    IF v_batch_cards = 0 THEN
      DROP TABLE _ontology_target;
      EXIT;
    END IF;

    CREATE TEMP TABLE _ontology_matches AS
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

    v_total_cards := v_total_cards + v_batch_cards;
    v_total_tags := v_total_tags + v_batch_tags;

    DROP TABLE _ontology_matches;
    DROP TABLE _ontology_target;

    -- Persist this batch so a later failure never redoes finished work.
    COMMIT;

    EXIT WHEN v_batch_cards < v_size;
  END LOOP;

  RAISE NOTICE 'classify_card_ontology_batched: % cards, % tags', v_total_cards, v_total_tags;
END;
$procedure$;

REVOKE ALL ON PROCEDURE public.classify_card_ontology_batched(integer) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE public.classify_card_ontology_batched(integer) TO service_role;