CREATE OR REPLACE FUNCTION public.increment_query_cache_hit_count(
  p_query_hash TEXT
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  UPDATE public.query_cache
  SET hit_count = hit_count + 1,
      last_hit_at = now()
  WHERE query_hash = p_query_hash
    AND expires_at > now();
$$;

REVOKE ALL ON FUNCTION public.increment_query_cache_hit_count(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_query_cache_hit_count(TEXT) TO service_role;
