
-- Enable pg_trgm extension for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop old alias-only function if it exists
DROP FUNCTION IF EXISTS public.match_concepts_by_alias(text, integer);

-- Create improved fuzzy concept matching function
CREATE OR REPLACE FUNCTION public.match_concepts_by_alias(
  search_term text,
  match_count integer DEFAULT 5
)
RETURNS TABLE (
  concept_id text,
  pattern text,
  scryfall_syntax text,
  scryfall_templates text[],
  negative_templates text[],
  description text,
  confidence numeric,
  category text,
  priority integer,
  similarity_score real
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    tr.pattern AS concept_id,
    tr.pattern,
    tr.scryfall_syntax,
    ARRAY[tr.scryfall_syntax] AS scryfall_templates,
    ARRAY[]::text[] AS negative_templates,
    tr.description,
    tr.confidence,
    COALESCE(tr.description, 'general') AS category,
    50 AS priority,
    -- Compute similarity: exact substring match gets 1.0, otherwise use trigram
    CASE
      WHEN lower(tr.pattern) = lower(search_term) THEN 1.0::real
      WHEN lower(tr.pattern) LIKE '%' || lower(search_term) || '%' THEN 0.9::real
      WHEN lower(search_term) LIKE '%' || lower(tr.pattern) || '%' THEN 0.85::real
      ELSE similarity(lower(tr.pattern), lower(search_term))
    END AS similarity_score
  FROM public.translation_rules tr
  WHERE tr.is_active = true
    AND tr.confidence >= 0.6
    AND (
      -- Exact match
      lower(tr.pattern) = lower(search_term)
      -- Substring containment (either direction)
      OR lower(tr.pattern) LIKE '%' || lower(search_term) || '%'
      OR lower(search_term) LIKE '%' || lower(tr.pattern) || '%'
      -- Trigram fuzzy match (threshold 0.3 for typo tolerance)
      OR similarity(lower(tr.pattern), lower(search_term)) > 0.3
    )
  ORDER BY
    CASE
      WHEN lower(tr.pattern) = lower(search_term) THEN 1.0::real
      WHEN lower(tr.pattern) LIKE '%' || lower(search_term) || '%' THEN 0.9::real
      WHEN lower(search_term) LIKE '%' || lower(tr.pattern) || '%' THEN 0.85::real
      ELSE similarity(lower(tr.pattern), lower(search_term))
    END DESC,
    tr.confidence DESC
  LIMIT match_count;
END;
$$;
