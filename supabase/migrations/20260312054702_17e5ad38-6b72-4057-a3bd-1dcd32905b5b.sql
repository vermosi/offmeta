
DROP FUNCTION IF EXISTS public.get_card_recommendations(text, integer, text);

CREATE FUNCTION public.get_card_recommendations(
  target_oracle_id text,
  result_limit integer DEFAULT 20,
  target_format text DEFAULT 'all'::text
)
RETURNS TABLE(
  oracle_id text,
  card_name text,
  cooccurrence_count integer,
  weight numeric,
  relationship_type text,
  mana_cost text,
  type_line text,
  image_url text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.oracle_id,
    c.name AS card_name,
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
  WHERE (co.card_a_oracle_id = target_oracle_id OR co.card_b_oracle_id = target_oracle_id)
    AND co.format = target_format
  ORDER BY co.weight DESC, co.cooccurrence_count DESC
  LIMIT result_limit;
END;
$$;
