
-- 1. Revoke EXECUTE on internal/cron/admin/trigger functions from anon + authenticated.
--    These are only invoked by service_role (cron jobs, edge functions) or as triggers.
REVOKE EXECUTE ON FUNCTION public.check_price_alerts() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_missing_oracle_ids() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_promotion_candidates(timestamptz, integer, numeric, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_zero_result_candidates(timestamptz, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_old_price_snapshots() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.refresh_archetype_stats() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_deck_card_count() FROM anon, authenticated;

-- 2. Admin RPCs check has_role() internally; revoke anon EXECUTE so they don't show as
--    publicly-callable (signed-in admins still pass via has_role check).
REVOKE EXECUTE ON FUNCTION public.get_ai_usage_stats(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_conversion_funnel(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_search_analytics(timestamptz, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_system_status() FROM anon;

-- 3. Drop redundant ALL-with-true policies scoped to service_role.
--    service_role bypasses RLS entirely, so these add no protection but trip the linter.
DROP POLICY IF EXISTS "Service role manages alerts" ON public.price_alerts;
DROP POLICY IF EXISTS "Service role manages notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Service role full access feedback" ON public.search_feedback;

-- 4. Remove broad SELECT-all policy on avatar objects.
--    The avatars bucket has public=true, so the public CDN path
--    (/storage/v1/object/public/avatars/...) still serves files without RLS.
--    Dropping this policy prevents anonymous LISTING of all uploaded avatars
--    via the storage API while keeping direct image URLs working.
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
