CREATE MATERIALIZED VIEW public.price_mover_stats AS
WITH latest AS (
  SELECT DISTINCT ON (ps.card_name)
    ps.card_name, ps.scryfall_id, ps.price_usd, ps.recorded_at
  FROM public.price_snapshots ps
  WHERE ps.price_usd IS NOT NULL AND ps.price_usd > 0
    AND ps.recorded_at >= now() - interval '5 days'
  ORDER BY ps.card_name, ps.recorded_at DESC
),
p7 AS (
  SELECT DISTINCT ON (ps.card_name) ps.card_name, ps.price_usd
  FROM public.price_snapshots ps
  WHERE ps.price_usd IS NOT NULL AND ps.price_usd > 0
    AND ps.recorded_at <= now() - interval '7 days'
    AND ps.recorded_at >= now() - interval '17 days'
  ORDER BY ps.card_name, ps.recorded_at DESC
),
p14 AS (
  SELECT DISTINCT ON (ps.card_name) ps.card_name, ps.price_usd
  FROM public.price_snapshots ps
  WHERE ps.price_usd IS NOT NULL AND ps.price_usd > 0
    AND ps.recorded_at <= now() - interval '14 days'
    AND ps.recorded_at >= now() - interval '28 days'
  ORDER BY ps.card_name, ps.recorded_at DESC
),
p30 AS (
  SELECT DISTINCT ON (ps.card_name) ps.card_name, ps.price_usd
  FROM public.price_snapshots ps
  WHERE ps.price_usd IS NOT NULL AND ps.price_usd > 0
    AND ps.recorded_at <= now() - interval '30 days'
    AND ps.recorded_at >= now() - interval '50 days'
  ORDER BY ps.card_name, ps.recorded_at DESC
)
SELECT
  l.card_name,
  l.scryfall_id,
  l.price_usd   AS current_price,
  l.recorded_at AS current_recorded_at,
  p7.price_usd  AS price_7d,
  p14.price_usd AS price_14d,
  p30.price_usd AS price_30d,
  c.rarity, c.type_line, c.colors, c.legalities
FROM latest l
LEFT JOIN p7  ON p7.card_name  = l.card_name
LEFT JOIN p14 ON p14.card_name = l.card_name
LEFT JOIN p30 ON p30.card_name = l.card_name
LEFT JOIN public.cards c ON c.name = l.card_name
WITH NO DATA;

CREATE UNIQUE INDEX price_mover_stats_card_name_idx ON public.price_mover_stats (card_name);

REVOKE ALL ON public.price_mover_stats FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_price_mover_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '300s'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.price_mover_stats;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_price_mover_stats() FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_price_movers(days_back integer DEFAULT 7, limit_count integer DEFAULT 50, min_price numeric DEFAULT 1.0)
 RETURNS TABLE(card_name text, scryfall_id text, current_price numeric, previous_price numeric, change_percent numeric, direction text, rarity text, type_line text, colors text[], legalities jsonb)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  WITH base AS (
    SELECT
      s.card_name, s.scryfall_id, s.current_price,
      CASE
        WHEN days_back <= 7  THEN s.price_7d
        WHEN days_back <= 14 THEN s.price_14d
        ELSE s.price_30d
      END AS previous_price,
      s.rarity, s.type_line, s.colors, s.legalities
    FROM public.price_mover_stats s
  )
  SELECT
    b.card_name,
    b.scryfall_id,
    b.current_price,
    b.previous_price,
    ROUND(((b.current_price - b.previous_price) / b.previous_price) * 100, 1) AS change_percent,
    CASE WHEN b.current_price > b.previous_price THEN 'up' ELSE 'down' END AS direction,
    b.rarity, b.type_line, b.colors, b.legalities
  FROM base b
  WHERE b.previous_price IS NOT NULL
    AND b.current_price IS DISTINCT FROM b.previous_price
    AND b.current_price >= GREATEST(min_price, 0.25)
    AND b.previous_price >= GREATEST(min_price, 0.25)
    AND ABS(b.current_price - b.previous_price) >= 0.25
    AND ABS(((b.current_price - b.previous_price) / b.previous_price) * 100) BETWEEN 2 AND 300
  ORDER BY ABS(((b.current_price - b.previous_price) / b.previous_price) * 100) DESC
  LIMIT GREATEST(limit_count, 1);
$$;