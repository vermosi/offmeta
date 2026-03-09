-- Materialized view for fast archetype aggregation
CREATE MATERIALIZED VIEW public.archetype_stats AS
SELECT
  format,
  archetype,
  count(*) AS deck_count,
  mode() WITHIN GROUP (ORDER BY array_to_string(colors, ',')) AS primary_colors_str,
  array_agg(DISTINCT c) FILTER (WHERE c IS NOT NULL) AS all_colors
FROM community_decks,
     LATERAL unnest(CASE WHEN colors = '{}' THEN ARRAY[NULL::text] ELSE colors END) AS c
WHERE archetype IS NOT NULL
GROUP BY format, archetype;

-- Index for fast reads
CREATE UNIQUE INDEX idx_archetype_stats_unique ON public.archetype_stats (format, archetype);

-- Function to refresh it (called after imports/detection)
CREATE OR REPLACE FUNCTION public.refresh_archetype_stats()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.archetype_stats;
$$;

-- Allow public reads
GRANT SELECT ON public.archetype_stats TO anon, authenticated;
