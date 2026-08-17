-- Support-shrunk relationship scoring and pre-limit relationship filtering.

-- A pair may carry independent co-play, functional, and substitution edges.
-- The original key predated relationship_type and silently forced them to
-- overwrite one another.
ALTER TABLE public.card_cooccurrence
  DROP CONSTRAINT IF EXISTS card_cooccurrence_pkey;
ALTER TABLE public.card_cooccurrence
  ADD CONSTRAINT card_cooccurrence_pkey PRIMARY KEY (
    card_a_oracle_id,
    card_b_oracle_id,
    format,
    relationship_type
  );

UPDATE public.card_cooccurrence
SET weight = LEAST(
  (cooccurrence_count::NUMERIC / (cooccurrence_count + 10)::NUMERIC)
  * (
    cooccurrence_count::NUMERIC
    / GREATEST(
        SQRT(
          (context->>'deck_count_a')::NUMERIC
          * (context->>'deck_count_b')::NUMERIC
        ),
        1
      )
  ),
  1
)
WHERE relationship_type = 'co_played'
  AND context ? 'deck_count_a'
  AND context ? 'deck_count_b'
  AND (context->>'deck_count_a') ~ '^\d+(\.\d+)?$'
  AND (context->>'deck_count_b') ~ '^\d+(\.\d+)?$';

DROP FUNCTION IF EXISTS public.get_card_recommendations(TEXT, INTEGER, TEXT);

CREATE FUNCTION public.get_card_recommendations(
  target_oracle_id TEXT,
  result_limit INTEGER DEFAULT 20,
  target_format TEXT DEFAULT 'all',
  target_relationship_type TEXT DEFAULT NULL
)
RETURNS TABLE(
  oracle_id TEXT,
  card_name TEXT,
  cooccurrence_count INTEGER,
  weight NUMERIC,
  relationship_type TEXT,
  mana_cost TEXT,
  type_line TEXT,
  image_url TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.oracle_id,
    c.name,
    co.cooccurrence_count,
    co.weight,
    co.relationship_type,
    c.mana_cost,
    c.type_line,
    c.image_url
  FROM public.card_cooccurrence co
  INNER JOIN public.cards c
    ON c.oracle_id = CASE
      WHEN co.card_a_oracle_id = target_oracle_id THEN co.card_b_oracle_id
      ELSE co.card_a_oracle_id
    END
  WHERE (
      co.card_a_oracle_id = target_oracle_id
      OR co.card_b_oracle_id = target_oracle_id
    )
    AND co.format = target_format
    AND (
      target_relationship_type IS NULL
      OR co.relationship_type = target_relationship_type
    )
  ORDER BY co.weight DESC, co.cooccurrence_count DESC, c.name ASC
  LIMIT LEAST(GREATEST(result_limit, 1), 50);
END;
$$;

REVOKE ALL ON FUNCTION public.get_card_recommendations(TEXT, INTEGER, TEXT, TEXT)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_card_recommendations(TEXT, INTEGER, TEXT, TEXT)
  TO anon, authenticated, service_role;
