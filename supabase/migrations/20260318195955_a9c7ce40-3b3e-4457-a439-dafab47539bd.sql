-- Fix: require search_term to be substantial relative to pattern length for LIKE matching
-- "colors" matching "dragons that cost 4 or 5 in mardu colors" should NOT get 0.9
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
      -- Pattern contains search_term: require search_term is >= 40% of pattern length
      WHEN length(trim(search_term)) >= 5
           AND length(trim(search_term))::real / GREATEST(length(trim(tr.pattern)), 1)::real >= 0.4
           AND lower(tr.pattern) LIKE '%' || lower(trim(search_term)) || '%' THEN 0.9::real
      -- Search_term contains pattern: require pattern is >= 40% of search_term length
      WHEN length(trim(tr.pattern)) >= 5
           AND length(trim(tr.pattern))::real / GREATEST(length(trim(search_term)), 1)::real >= 0.4
           AND lower(search_term) LIKE '%' || lower(trim(tr.pattern)) || '%' THEN 0.85::real
      ELSE similarity(lower(tr.pattern), lower(search_term))
    END AS similarity_score
  FROM public.translation_rules tr
  WHERE tr.is_active = true
    AND tr.confidence >= 0.6
    AND (
      lower(tr.pattern) = lower(search_term)
      OR (
        -- Pattern contains search_term: min 5 chars AND >= 40% of pattern length
        length(trim(search_term)) >= 5
        AND length(trim(search_term))::real / GREATEST(length(trim(tr.pattern)), 1)::real >= 0.4
        AND lower(tr.pattern) LIKE '%' || lower(trim(search_term)) || '%'
      )
      OR (
        -- Search_term contains pattern: min 5 chars AND >= 40% of search_term length
        length(trim(tr.pattern)) >= 5
        AND length(trim(tr.pattern))::real / GREATEST(length(trim(search_term)), 1)::real >= 0.4
        AND lower(search_term) LIKE '%' || lower(trim(tr.pattern)) || '%'
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
      WHEN length(trim(search_term)) >= 5
           AND length(trim(search_term))::real / GREATEST(length(trim(tr.pattern)), 1)::real >= 0.4
           AND lower(tr.pattern) LIKE '%' || lower(trim(search_term)) || '%' THEN 0.9::real
      WHEN length(trim(tr.pattern)) >= 5
           AND length(trim(tr.pattern))::real / GREATEST(length(trim(search_term)), 1)::real >= 0.4
           AND lower(search_term) LIKE '%' || lower(trim(tr.pattern)) || '%' THEN 0.85::real
      ELSE similarity(lower(tr.pattern), lower(search_term))
    END DESC,
    tr.confidence DESC
  LIMIT match_count;
END;
$function$;

-- Clear poisoned cache
DELETE FROM query_cache WHERE normalized_query ILIKE '%discard%' OR normalized_query ILIKE '%esper%';