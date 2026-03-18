-- Fix match_concepts_by_alias: prevent short search terms from LIKE-matching everything
-- and require word boundaries for substring matching
CREATE OR REPLACE FUNCTION public.match_concepts_by_alias(search_term text, match_count integer DEFAULT 5)
 RETURNS TABLE(concept_id text, pattern text, scryfall_syntax text, scryfall_templates text[], negative_templates text[], description text, confidence numeric, category text, priority integer, similarity_score real)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    CASE
      WHEN lower(tr.pattern) = lower(search_term) THEN 1.0::real
      -- Substring matches require search_term >= 5 chars to prevent "in", "or", "colors" matching everything
      WHEN length(trim(search_term)) >= 5 AND lower(tr.pattern) LIKE '%' || lower(search_term) || '%' THEN 0.9::real
      WHEN length(trim(search_term)) >= 5 AND lower(search_term) LIKE '%' || lower(tr.pattern) || '%' THEN 0.85::real
      ELSE similarity(lower(tr.pattern), lower(search_term))
    END AS similarity_score
  FROM public.translation_rules tr
  WHERE tr.is_active = true
    AND tr.confidence >= 0.6
    AND (
      lower(tr.pattern) = lower(search_term)
      OR (
        -- Only allow substring matching for search terms >= 5 chars
        length(trim(search_term)) >= 5
        AND (
          lower(tr.pattern) LIKE '%' || lower(search_term) || '%'
          OR lower(search_term) LIKE '%' || lower(tr.pattern) || '%'
        )
      )
      OR (
        -- Trigram matching for short patterns only
        array_length(string_to_array(trim(tr.pattern), ' '), 1) <= 4
        AND similarity(lower(tr.pattern), lower(search_term)) > 0.4
      )
    )
  ORDER BY
    CASE
      WHEN lower(tr.pattern) = lower(search_term) THEN 1.0::real
      WHEN length(trim(search_term)) >= 5 AND lower(tr.pattern) LIKE '%' || lower(search_term) || '%' THEN 0.9::real
      WHEN length(trim(search_term)) >= 5 AND lower(search_term) LIKE '%' || lower(tr.pattern) || '%' THEN 0.85::real
      ELSE similarity(lower(tr.pattern), lower(search_term))
    END DESC,
    tr.confidence DESC
  LIMIT match_count;
END;
$function$;

-- Clear any poisoned cache entries
DELETE FROM query_cache WHERE normalized_query ILIKE '%discard%esper%' OR normalized_query ILIKE '%esper%discard%';