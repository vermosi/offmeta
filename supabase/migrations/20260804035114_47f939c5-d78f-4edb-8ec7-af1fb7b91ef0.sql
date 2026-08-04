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
)
SELECT a.card_name, a.scryfall_id, a.current_price, a.current_recorded_at,
       a.price_7d, a.price_14d, a.price_30d,
       m.rarity, m.type_line, m.colors, m.legalities
FROM agg a
JOIN card_meta m ON m.name = a.card_name
WHERE a.current_price IS NOT NULL
  AND m.type_line IS NOT NULL
  AND m.type_line !~* '(^|\s)(Plane|Phenomenon|Scheme|Vanguard|Emblem|Dungeon|Stickers|Attraction|Contraption)(\s|$|—)'
  AND m.type_line !~* '(^|\s)Token(\s|$|—)';

CREATE UNIQUE INDEX price_mover_stats_card_name_idx ON public.price_mover_stats USING btree (card_name);

GRANT SELECT ON public.price_mover_stats TO service_role;

REFRESH MATERIALIZED VIEW public.price_mover_stats;