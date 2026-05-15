
REVOKE EXECUTE ON FUNCTION public.check_price_alerts() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_missing_oracle_ids() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_promotion_candidates(timestamptz, integer, numeric, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_zero_result_candidates(timestamptz, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prune_old_price_snapshots() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.refresh_archetype_stats() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_deck_card_count() FROM PUBLIC;

-- Admin RPCs: revoke from PUBLIC and anon, keep authenticated (has_role check inside)
REVOKE EXECUTE ON FUNCTION public.get_ai_usage_stats(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_conversion_funnel(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_search_analytics(timestamptz, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_system_status() FROM PUBLIC;

-- has_role: only signed-in users
REVOKE EXECUTE ON FUNCTION public.has_role(app_role) FROM PUBLIC;
