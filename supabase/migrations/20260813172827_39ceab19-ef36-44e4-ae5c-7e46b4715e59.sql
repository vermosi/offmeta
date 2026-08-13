-- ---------------------------------------------------------------------------
-- Deterministic card ontology
--
-- Rules live as data in public.ontology_tags so classification has exactly one
-- source of truth (no client/edge duplication) and is reproducible: the same
-- card text against the same rule set always yields the same tags.
-- ---------------------------------------------------------------------------

CREATE TABLE public.ontology_tags (
  tag_key       text PRIMARY KEY,
  dimension     text NOT NULL CHECK (dimension IN ('role', 'method', 'problem', 'characteristic')),
  label         text NOT NULL,
  description   text,
  -- POSIX regexes tested against lower(oracle_text || '\n' || type_line).
  -- An empty array means "structural only" (matches every card that passes the
  -- structural predicates below).
  signatures    text[] NOT NULL DEFAULT '{}',
  -- Any match here vetoes the tag, for false-positive control.
  exclusions    text[] NOT NULL DEFAULT '{}',
  -- Optional structural predicates.
  type_pattern  text,
  min_cmc       numeric,
  max_cmc       numeric,
  max_colors    integer,
  priority      integer NOT NULL DEFAULT 100,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ontology_tags TO anon;
GRANT SELECT ON public.ontology_tags TO authenticated;
GRANT ALL ON public.ontology_tags TO service_role;

ALTER TABLE public.ontology_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Ontology tags are publicly readable"
  ON public.ontology_tags FOR SELECT
  USING (true);

CREATE TRIGGER update_ontology_tags_updated_at
  BEFORE UPDATE ON public.ontology_tags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_ontology_tags_dimension ON public.ontology_tags (dimension) WHERE is_active;


CREATE TABLE public.card_ontology (
  oracle_id         text NOT NULL,
  tag_key           text NOT NULL REFERENCES public.ontology_tags(tag_key) ON DELETE CASCADE,
  dimension         text NOT NULL,
  -- The exact rule that fired, so any assignment can be audited.
  matched_signature text,
  classified_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (oracle_id, tag_key)
);

GRANT SELECT ON public.card_ontology TO anon;
GRANT SELECT ON public.card_ontology TO authenticated;
GRANT ALL ON public.card_ontology TO service_role;

ALTER TABLE public.card_ontology ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Card ontology is publicly readable"
  ON public.card_ontology FOR SELECT
  USING (true);

CREATE INDEX idx_card_ontology_tag ON public.card_ontology (tag_key);
CREATE INDEX idx_card_ontology_dimension ON public.card_ontology (dimension, tag_key);


-- Recompute ontology assignments.
--   p_limit  — cap the number of cards processed (NULL = whole pool)
--   p_since  — only cards whose row changed at/after this timestamp
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
      AND NOT EXISTS (
        SELECT 1 FROM unnest(g.exclusions) AS e WHERE t.txt ~ e
      );

  -- Full replace for the processed slice: a rule that stops matching must also
  -- remove its old assignment, otherwise the table drifts from the rules.
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


-- Read ontology for a set of cards, joined to human-facing labels.
CREATE OR REPLACE FUNCTION public.get_card_ontology(p_oracle_ids text[])
RETURNS TABLE(
  oracle_id text,
  tag_key text,
  dimension text,
  label text,
  description text,
  priority integer,
  matched_signature text
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $$
  SELECT
    co.oracle_id,
    co.tag_key,
    co.dimension,
    g.label,
    g.description,
    g.priority,
    co.matched_signature
  FROM public.card_ontology co
  JOIN public.ontology_tags g ON g.tag_key = co.tag_key
  WHERE co.oracle_id = ANY(coalesce(p_oracle_ids, '{}'))
    AND g.is_active
  ORDER BY co.oracle_id, g.priority, co.tag_key;
$$;

GRANT EXECUTE ON FUNCTION public.get_card_ontology(text[]) TO anon, authenticated, service_role;


-- Keep tags in step with nightly card data updates.
SELECT cron.schedule(
  'classify-card-ontology',
  '20 4 * * *',
  $$SELECT public.classify_card_ontology();$$
);