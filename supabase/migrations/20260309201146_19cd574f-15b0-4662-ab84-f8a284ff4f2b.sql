-- Drop and recreate the materialized view with new columns
DROP MATERIALIZED VIEW IF EXISTS public.archetype_stats;

CREATE MATERIALIZED VIEW public.archetype_stats AS
SELECT
  cd.format,
  cd.macro_archetype,
  cd.deck_name,
  cd.archetype,
  COUNT(*) AS deck_count,
  ARRAY_AGG(DISTINCT unnested_color) FILTER (WHERE unnested_color IS NOT NULL) AS all_colors,
  -- Calculate metagame percentage within each format
  ROUND(
    (COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY cd.format), 0)) * 100, 
    1
  ) AS meta_percentage
FROM public.community_decks cd
LEFT JOIN LATERAL unnest(cd.colors) AS unnested_color ON true
WHERE cd.deck_name IS NOT NULL
GROUP BY cd.format, cd.macro_archetype, cd.deck_name, cd.archetype
ORDER BY cd.format, COUNT(*) DESC;

-- Create unique index for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS archetype_stats_unique_idx 
  ON public.archetype_stats(format, deck_name);

-- Refresh function already exists, it will work with the new view
SELECT refresh_archetype_stats();