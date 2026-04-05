
CREATE OR REPLACE FUNCTION public.get_zero_result_candidates(
  since_date timestamptz,
  min_frequency integer DEFAULT 3,
  max_results integer DEFAULT 10
)
RETURNS TABLE(query text, frequency bigint, last_translation text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    LOWER(TRIM(tl.natural_language_query)) AS query,
    COUNT(*) AS frequency,
    MODE() WITHIN GROUP (ORDER BY tl.translated_query) AS last_translation
  FROM translation_logs tl
  WHERE tl.created_at >= since_date
    AND tl.result_count = 0
    AND LOWER(TRIM(tl.natural_language_query)) NOT IN ('ping warmup', 'warmup')
    AND LENGTH(TRIM(tl.natural_language_query)) >= 3
  GROUP BY LOWER(TRIM(tl.natural_language_query))
  HAVING COUNT(*) >= min_frequency
  ORDER BY COUNT(*) DESC
  LIMIT max_results;
$$;
