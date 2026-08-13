ALTER TABLE public.ontology_tags ADD COLUMN min_colors integer;

CREATE OR REPLACE FUNCTION public.classify_card_ontology(
  p_limit integer DEFAULT NULL,
  p_since timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '600s'
AS $$
DECLARE
  v_cards integer := 0;
  v_tags  integer := 0;
BEGIN
  CREATE TEMP TABLE _ontology_target ON COMMIT DROP AS
    SELECT
      c.oracle_id,
      lower(coalesce(c.oracle_text, '') || E'\n' || coalesce(c.type_line, '')) AS txt,
      lower(coalesce(c.type_line, '')) AS type_line,
      coalesce(c.cmc, 0)::numeric AS cmc,
      coalesce(array_length(c.colors, 1), 0) AS color_count
    FROM public.cards c
    WHERE (p_since IS NULL OR c.updated_at >= p_since)
    ORDER BY c.oracle_id
    LIMIT coalesce(p_limit, 1000000);

  SELECT count(*) INTO v_cards FROM _ontology_target;

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

  GET DIAGNOSTICS v_tags = ROW_COUNT;

  RETURN jsonb_build_object(
    'cards_processed', v_cards,
    'tags_assigned', v_tags,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.classify_card_ontology(integer, timestamptz) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.classify_card_ontology(integer, timestamptz) TO service_role;

-- Rule corrections found by reviewing the first pass.
UPDATE public.ontology_tags SET min_colors = 1 WHERE tag_key = 'mono_color';
UPDATE public.ontology_tags
  SET signatures = ARRAY['(^|[^a-z])if ', 'as long as', 'only if', 'unless']
  WHERE tag_key = 'conditional';

INSERT INTO public.ontology_tags (tag_key, dimension, label, description, signatures, priority)
VALUES (
  'bounce', 'role', 'Bounce', 'Returns permanents to their owner''s hand.',
  ARRAY['return target [a-z ]*to (its|their) owner''s hand', 'return all [a-z ]*to (its|their) owner', 'return it to (its|their) owner''s hand'],
  30
)
ON CONFLICT (tag_key) DO NOTHING;

SELECT public.classify_card_ontology();