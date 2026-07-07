CREATE OR REPLACE FUNCTION public.get_search_analytics(
  since_date timestamp with time zone,
  max_low_confidence integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'admin_api'
AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  RETURN admin_api.get_search_analytics(since_date, max_low_confidence);
END;
$$;

REVOKE ALL ON FUNCTION public.get_search_analytics(timestamp with time zone, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_search_analytics(timestamp with time zone, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_search_analytics(timestamp with time zone, integer) TO service_role;