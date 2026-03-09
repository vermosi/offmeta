
CREATE OR REPLACE FUNCTION public.get_missing_oracle_ids()
RETURNS TABLE(oracle_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT cdc.scryfall_oracle_id AS oracle_id
  FROM public.community_deck_cards cdc
  LEFT JOIN public.cards c ON c.oracle_id = cdc.scryfall_oracle_id
  WHERE cdc.scryfall_oracle_id IS NOT NULL
    AND c.oracle_id IS NULL
  LIMIT 1000;
$$;
