DROP MATERIALIZED VIEW IF EXISTS public.archetype_stats CASCADE;
DROP FUNCTION IF EXISTS public.refresh_archetype_stats() CASCADE;
DROP FUNCTION IF EXISTS public.get_signature_cards(text) CASCADE;
DROP FUNCTION IF EXISTS public.get_missing_oracle_ids() CASCADE;
DROP TABLE IF EXISTS public.community_deck_cards CASCADE;
DROP TABLE IF EXISTS public.community_decks CASCADE;
DROP TABLE IF EXISTS public.archetype_snapshots CASCADE;