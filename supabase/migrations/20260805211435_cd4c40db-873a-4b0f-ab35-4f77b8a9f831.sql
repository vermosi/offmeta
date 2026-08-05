UPDATE public.error_events
SET status = 'ignored',
    last_fix_at = now(),
    last_fix_result = jsonb_build_object('outcomes', jsonb_build_array(jsonb_build_object('action','ignore','ok',true,'detail','non_production_origin')))
WHERE status = 'open'
  AND (url LIKE 'http://localhost%' OR url LIKE '%.lovableproject.com%' OR url LIKE 'http://127.0.0.1%');