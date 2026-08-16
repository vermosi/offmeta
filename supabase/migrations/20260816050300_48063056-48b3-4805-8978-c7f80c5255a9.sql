CREATE OR REPLACE FUNCTION public.record_translation_result_count(
  p_request_id text,
  p_result_count integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_request_id IS NULL OR length(p_request_id) = 0 OR length(p_request_id) > 100 THEN
    RETURN;
  END IF;
  IF p_result_count IS NULL OR p_result_count < 0 THEN
    RETURN;
  END IF;

  UPDATE public.translation_logs
     SET result_count = LEAST(p_result_count, 2000000000)
   WHERE request_id = p_request_id
     AND result_count IS NULL
     AND created_at > now() - interval '1 hour';
END;
$$;

REVOKE ALL ON FUNCTION public.record_translation_result_count(text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.record_translation_result_count(text, integer) TO anon, authenticated, service_role;