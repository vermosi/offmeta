REVOKE ALL ON public.collections FROM anon;
REVOKE ALL ON public.saved_cards FROM anon;
REVOKE ALL ON public.saved_card_collections FROM anon;
REVOKE ALL ON public.saved_searches FROM anon;
REVOKE ALL ON public.search_history FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_cards TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_card_collections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_searches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.search_history TO authenticated;

GRANT ALL ON public.collections TO service_role;
GRANT ALL ON public.saved_cards TO service_role;
GRANT ALL ON public.saved_card_collections TO service_role;
GRANT ALL ON public.saved_searches TO service_role;
GRANT ALL ON public.search_history TO service_role;