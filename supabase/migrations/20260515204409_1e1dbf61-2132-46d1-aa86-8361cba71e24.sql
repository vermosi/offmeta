
REVOKE ALL ON public.archetype_stats FROM PUBLIC;
REVOKE ALL ON public.archetype_stats FROM anon;
REVOKE ALL ON public.archetype_stats FROM authenticated;
GRANT SELECT ON public.archetype_stats TO service_role;
