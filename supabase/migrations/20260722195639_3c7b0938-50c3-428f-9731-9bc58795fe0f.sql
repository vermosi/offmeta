
CREATE OR REPLACE FUNCTION public.get_system_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'admin_api'
AS $$
BEGIN
  IF NOT public.has_role('admin'::app_role) THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  RETURN admin_api.get_system_status();
END;
$$;

REVOKE ALL ON FUNCTION public.get_system_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_system_status() TO authenticated, service_role;
