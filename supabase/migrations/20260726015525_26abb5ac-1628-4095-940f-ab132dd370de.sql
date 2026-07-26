
-- Replace the has_role guard with a version that also accepts service_role.
-- Uses regexp_replace on function bodies to avoid re-pasting hundreds of SQL lines.
DO $$
DECLARE
  fn record;
  new_def text;
BEGIN
  FOR fn IN
    SELECT p.oid, pg_get_functiondef(p.oid) AS def
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'admin_api'
  LOOP
    new_def := replace(
      fn.def,
      'IF NOT public.has_role(''admin''::app_role) THEN',
      'IF current_user <> ''service_role'' AND current_setting(''request.jwt.claim.role'', true) <> ''service_role'' AND NOT public.has_role(''admin''::app_role) THEN'
    );
    IF new_def <> fn.def THEN
      EXECUTE new_def;
    END IF;
  END LOOP;
END $$;
