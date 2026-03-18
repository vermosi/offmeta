-- Clear poisoned cache entry with dragon syntax leaking into esper discard query
DELETE FROM query_cache WHERE normalized_query = 'free discard outlets in esper colors';

-- Tighten match_concepts_by_alias: raise trigram threshold from 0.3 to 0.4
-- and skip trigram matching for long multi-word patterns (5+ words)
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
      WHEN lower(tr.pattern) LIKE '%' || lower(search_term) || '%' THEN 0.9::real
      WHEN lower(search_term) LIKE '%' || lower(tr.pattern) || '%' THEN 0.85::real
      ELSE similarity(lower(tr.pattern), lower(search_term))
    END AS similarity_score
  FROM public.translation_rules tr
  WHERE tr.is_active = true
    AND tr.confidence >= 0.6
    AND (
      lower(tr.pattern) = lower(search_term)
      OR lower(tr.pattern) LIKE '%' || lower(search_term) || '%'
      OR lower(search_term) LIKE '%' || lower(tr.pattern) || '%'
      OR (
        array_length(string_to_array(trim(tr.pattern), ' '), 1) <= 4
        AND similarity(lower(tr.pattern), lower(search_term)) > 0.4
      )
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
$function$;