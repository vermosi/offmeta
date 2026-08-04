CREATE OR REPLACE FUNCTION public.get_price_movers(days_back integer DEFAULT 7, limit_count integer DEFAULT 50, min_price numeric DEFAULT 1.0)
 RETURNS TABLE(card_name text, scryfall_id text, current_price numeric, previous_price numeric, change_percent numeric, direction text, rarity text, type_line text, colors text[], legalities jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH latest AS (
    SELECT DISTINCT ON (ps.card_name)
      ps.card_name, ps.scryfall_id, ps.price_usd, ps.recorded_at
    FROM public.price_snapshots ps
    WHERE ps.price_usd IS NOT NULL
      AND ps.price_usd > 0
      AND ps.recorded_at >= (now() - interval '3 days')
    ORDER BY ps.card_name, ps.recorded_at DESC
  ),
  previous AS (
    SELECT DISTINCT ON (ps.card_name)
      ps.card_name, ps.price_usd, ps.recorded_at
    FROM public.price_snapshots ps
    WHERE ps.price_usd IS NOT NULL
      AND ps.price_usd > 0
      AND ps.recorded_at <= (now() - make_interval(days => days_back))
      AND ps.recorded_at >= (now() - make_interval(days => days_back * 2 + 3))
    ORDER BY ps.card_name, ps.recorded_at DESC
  )
  SELECT
    l.card_name,
    l.scryfall_id,
    l.price_usd,
    p.price_usd,
    ROUND(((l.price_usd - p.price_usd) / p.price_usd) * 100, 1),
    CASE
      WHEN l.price_usd > p.price_usd THEN 'up'
      WHEN l.price_usd < p.price_usd THEN 'down'
      ELSE 'stable'
    END,
    c.rarity, c.type_line, c.colors, c.legalities
  FROM latest l
  INNER JOIN previous p ON l.card_name = p.card_name
  LEFT JOIN public.cards c ON c.name = l.card_name
  WHERE l.price_usd IS DISTINCT FROM p.price_usd
    AND l.price_usd >= GREATEST(min_price, 0.25)
    AND p.price_usd >= GREATEST(min_price, 0.25)
    AND ABS(l.price_usd - p.price_usd) >= 0.25
    AND ABS(((l.price_usd - p.price_usd) / p.price_usd) * 100) BETWEEN 2 AND 300
  ORDER BY ABS(((l.price_usd - p.price_usd) / p.price_usd) * 100) DESC
  LIMIT GREATEST(limit_count, 1);
END;
$function$;