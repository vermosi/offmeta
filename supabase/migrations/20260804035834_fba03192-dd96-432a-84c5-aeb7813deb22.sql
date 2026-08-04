DROP FUNCTION IF EXISTS public.get_price_movers(integer, integer, numeric);

DROP MATERIALIZED VIEW IF EXISTS public.price_mover_stats;

CREATE MATERIALIZED VIEW public.price_mover_stats AS
WITH agg AS (
  SELECT ps.card_name,
    (array_agg(ps.scryfall_id ORDER BY ps.recorded_at DESC) FILTER (WHERE ps.recorded_at >= now() - interval '5 days'))[1] AS scryfall_id,
    (array_agg(ps.price_usd ORDER BY ps.recorded_at DESC) FILTER (WHERE ps.recorded_at >= now() - interval '5 days'))[1] AS current_price,
    max(ps.recorded_at) AS current_recorded_at,
    (array_agg(ps.price_usd ORDER BY ps.recorded_at DESC) FILTER (WHERE ps.recorded_at <= now() - interval '7 days'))[1] AS price_7d,
    (array_agg(ps.price_usd ORDER BY ps.recorded_at DESC) FILTER (WHERE ps.recorded_at <= now() - interval '14 days'))[1] AS price_14d,
    (array_agg(ps.price_usd ORDER BY ps.recorded_at DESC) FILTER (WHERE ps.recorded_at <= now() - interval '30 days'))[1] AS price_30d
  FROM public.price_snapshots ps
  WHERE ps.price_usd IS NOT NULL AND ps.price_usd > 0 AND ps.recorded_at >= now() - interval '45 days'
  GROUP BY ps.card_name
), card_meta AS (
  SELECT DISTINCT ON (c.name) c.name, c.rarity, c.type_line, c.colors, c.legalities
  FROM public.cards c
  ORDER BY c.name, c.updated_at DESC
), printing_meta AS (
  SELECT DISTINCT ON (cp.mtgjson_uuid) cp.mtgjson_uuid, cp.set_name, cp.collector_number
  FROM public.card_printings cp
  WHERE cp.mtgjson_uuid IS NOT NULL
  ORDER BY cp.mtgjson_uuid, cp.updated_at DESC
)
SELECT a.card_name, a.scryfall_id, a.current_price, a.current_recorded_at,
       a.price_7d, a.price_14d, a.price_30d,
       m.rarity, m.type_line, m.colors, m.legalities,
       p.set_name, p.collector_number
FROM agg a
JOIN card_meta m ON m.name = a.card_name
LEFT JOIN printing_meta p ON p.mtgjson_uuid = a.scryfall_id
WHERE a.current_price IS NOT NULL
  AND m.type_line IS NOT NULL
  AND m.type_line !~* '(^|\s)(Plane|Phenomenon|Scheme|Vanguard|Emblem|Dungeon|Stickers|Attraction|Contraption)(\s|$|—)'
  AND m.type_line !~* '(^|\s)Token(\s|$|—)';

CREATE UNIQUE INDEX price_mover_stats_card_name_idx ON public.price_mover_stats USING btree (card_name);

GRANT SELECT ON public.price_mover_stats TO service_role;

CREATE OR REPLACE FUNCTION public.get_price_movers(
  days_back integer DEFAULT 7,
  limit_count integer DEFAULT 50,
  min_price numeric DEFAULT 1.0
)
RETURNS TABLE(
  card_name text,
  scryfall_id text,
  current_price numeric,
  previous_price numeric,
  change_percent numeric,
  direction text,
  rarity text,
  type_line text,
  colors text[],
  legalities jsonb,
  set_name text,
  collector_number text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      s.card_name, s.scryfall_id, s.current_price,
      CASE
        WHEN days_back <= 7  THEN s.price_7d
        WHEN days_back <= 14 THEN s.price_14d
        ELSE s.price_30d
      END AS previous_price,
      s.rarity, s.type_line, s.colors, s.legalities, s.set_name, s.collector_number
    FROM public.price_mover_stats s
  )
  SELECT
    b.card_name,
    b.scryfall_id,
    b.current_price,
    b.previous_price,
    ROUND(((b.current_price - b.previous_price) / b.previous_price) * 100, 1) AS change_percent,
    CASE WHEN b.current_price > b.previous_price THEN 'up' ELSE 'down' END AS direction,
    b.rarity, b.type_line, b.colors, b.legalities,
    b.set_name, b.collector_number
  FROM base b
  WHERE b.previous_price IS NOT NULL
    AND b.current_price IS DISTINCT FROM b.previous_price
    AND b.current_price >= GREATEST(min_price, 0.25)
    AND b.previous_price >= GREATEST(min_price, 0.25)
    AND ABS(b.current_price - b.previous_price) >= 0.25
    AND ABS(((b.current_price - b.previous_price) / b.previous_price) * 100) BETWEEN 2 AND 300
  ORDER BY ABS(((b.current_price - b.previous_price) / b.previous_price) * 100) DESC
  LIMIT GREATEST(limit_count, 1);
$function$;

REFRESH MATERIALIZED VIEW public.price_mover_stats;