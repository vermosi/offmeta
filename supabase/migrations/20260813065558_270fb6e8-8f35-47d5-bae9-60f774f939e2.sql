REVOKE EXECUTE ON FUNCTION public.claim_dedupe_key(text, integer, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_dedupe_decision(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_dedupe_and_locks() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_dedupe_key(text, integer, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_dedupe_decision(text, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.prune_dedupe_and_locks() TO service_role;