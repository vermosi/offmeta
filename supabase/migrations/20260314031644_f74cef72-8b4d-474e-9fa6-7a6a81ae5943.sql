CREATE OR REPLACE FUNCTION public.get_promotion_candidates(
  since_date timestamptz,
  min_frequency integer DEFAULT 5,
  min_confidence numeric DEFAULT 0.75,
  max_results integer DEFAULT 20
)
RETURNS TABLE(
  query text,
  frequency bigint,
  avg_confidence numeric,
  top_translation text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    LOWER(TRIM(tl.natural_language_query)) AS query,
    COUNT(*) AS frequency,
    ROUND(AVG(COALESCE(tl.confidence_score, 0))::numeric, 3) AS avg_confidence,
    MODE() WITHIN GROUP (ORDER BY tl.translated_query) AS top_translation
  FROM translation_logs tl
  WHERE tl.created_at >= since_date
    AND LOWER(TRIM(tl.natural_language_query)) NOT IN ('ping warmup', 'warmup')
    AND tl.natural_language_query !~ '(?:t:\s*){4,}'
    AND LENGTH(TRIM(tl.natural_language_query)) >= 5
    AND COALESCE(tl.confidence_score, 0) >= 0.5
  GROUP BY LOWER(TRIM(tl.natural_language_query))
  HAVING COUNT(*) >= min_frequency
    AND AVG(COALESCE(tl.confidence_score, 0)) >= min_confidence
  ORDER BY COUNT(*) DESC, AVG(COALESCE(tl.confidence_score, 0)) DESC
  LIMIT max_results;
$$;