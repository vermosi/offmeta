
CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(days_back integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'admin_api'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role'
     AND NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  RETURN admin_api.get_ai_usage_stats(days_back);
END; $function$;

CREATE OR REPLACE FUNCTION public.get_conversion_funnel(days_back integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'admin_api'
AS $function$
BEGIN
  IF current_setting('request.jwt.claim.role', true) <> 'service_role'
     AND NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  RETURN admin_api.get_conversion_funnel(days_back);
END; $function$;
