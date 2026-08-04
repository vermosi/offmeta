-- 1. apply_query_signal: internal/trigger use only
REVOKE EXECUTE ON FUNCTION public.apply_query_signal(text, text, text, uuid, integer, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_query_signal(text, text, text, uuid, integer, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_query_signal(text, text, text, uuid, integer, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_query_signal(text, text, text, uuid, integer, jsonb) TO service_role;

-- 2. get_query_intelligence: admin/service only (mirrors query_intelligence_agg RLS)
REVOKE EXECUTE ON FUNCTION public.get_query_intelligence(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_query_intelligence(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_query_intelligence(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_query_intelligence(text) TO service_role;

-- 3. price_mover_stats materialized view: remove Data API exposure.
--    Reads continue through the SECURITY DEFINER get_price_movers() RPC.
REVOKE ALL ON public.price_mover_stats FROM anon;
REVOKE ALL ON public.price_mover_stats FROM authenticated;
GRANT SELECT ON public.price_mover_stats TO service_role;