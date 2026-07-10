
CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(days_back integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, admin_api AS $$
BEGIN
  IF NOT public.has_role('admin') THEN RAISE EXCEPTION 'Insufficient privileges'; END IF;
  RETURN admin_api.get_ai_usage_stats(days_back);
END; $$;

CREATE OR REPLACE FUNCTION public.get_conversion_funnel(days_back integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, admin_api AS $$
BEGIN
  IF NOT public.has_role('admin') THEN RAISE EXCEPTION 'Insufficient privileges'; END IF;
  RETURN admin_api.get_conversion_funnel(days_back);
END; $$;

REVOKE ALL ON FUNCTION public.get_ai_usage_stats(integer) FROM public, anon;
REVOKE ALL ON FUNCTION public.get_conversion_funnel(integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_ai_usage_stats(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversion_funnel(integer) TO authenticated;
