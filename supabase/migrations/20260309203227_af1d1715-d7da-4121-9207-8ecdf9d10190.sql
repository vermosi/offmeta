CREATE OR REPLACE FUNCTION public.get_signature_cards(target_format text DEFAULT NULL)
RETURNS TABLE(deck_name text, card_name text, image_url text, appearances bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT DISTINCT ON (cd.deck_name)
    cd.deck_name,
    cdc.card_name,
    c.image_url,
    count(*) OVER (PARTITION BY cd.deck_name, cdc.card_name) AS appearances
  FROM community_decks cd
  JOIN community_deck_cards cdc ON cdc.deck_id = cd.id
  LEFT JOIN cards c ON c.oracle_id = cdc.scryfall_oracle_id
  WHERE cd.deck_name IS NOT NULL
    AND cdc.board = 'mainboard'
    AND c.type_line IS NOT NULL
    AND c.type_line NOT LIKE '%Basic Land%'
    AND c.image_url IS NOT NULL
    AND (target_format IS NULL OR cd.format = target_format)
  ORDER BY cd.deck_name, count(*) OVER (PARTITION BY cd.deck_name, cdc.card_name) DESC, cdc.card_name
$$;