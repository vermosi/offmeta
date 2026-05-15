-- Tighten EXECUTE permissions on admin-gated SECURITY DEFINER RPCs.
-- Each of these functions already calls has_role('admin') internally and
-- raises 'Forbidden: admin role required' for non-admins, but EXECUTE was
-- previously granted to PUBLIC/anon. Revoking it ensures unauthenticated
-- callers cannot even invoke the function, leaving has_role() as the
-- second line of defence for authenticated non-admins.

REVOKE EXECUTE ON FUNCTION public.get_conversion_funnel(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_search_analytics(timestamp with time zone, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_ai_usage_stats(integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_system_status() FROM PUBLIC, anon;

-- Keep authenticated role able to call them; the in-function has_role('admin')
-- check rejects non-admins with a clean error.
GRANT EXECUTE ON FUNCTION public.get_conversion_funnel(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_search_analytics(timestamp with time zone, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_system_status() TO authenticated;