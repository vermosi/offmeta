
-- Create dedicated schema for extensions
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

-- Move pg_trgm out of public. ALTER EXTENSION SET SCHEMA moves all
-- extension-owned objects (operators, functions, opclasses) and updates
-- existing index/operator references automatically.
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

-- Update search_path on functions that rely on trigram operators/functions
-- so they continue resolving similarity()/% after the move.
ALTER FUNCTION public.match_concepts_by_alias(text, integer)
  SET search_path = public, extensions;

ALTER FUNCTION public.get_zero_result_candidates(timestamptz, integer, integer)
  SET search_path = public, extensions;

ALTER FUNCTION public.get_promotion_candidates(timestamptz, integer, numeric, integer)
  SET search_path = public, extensions;

ALTER FUNCTION public.get_search_analytics(timestamptz, integer)
  SET search_path = public, extensions;
