-- Drop helper functions tied to the removed features
DROP FUNCTION IF EXISTS public.get_deck_vote_count(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.update_deck_card_count() CASCADE;
DROP FUNCTION IF EXISTS public.validate_deck_tag() CASCADE;
DROP FUNCTION IF EXISTS public.validate_deck_comment() CASCADE;
DROP FUNCTION IF EXISTS public.validate_collection_card() CASCADE;
DROP FUNCTION IF EXISTS public.validate_price_alert() CASCADE;
DROP FUNCTION IF EXISTS public.check_price_alerts() CASCADE;
DROP FUNCTION IF EXISTS public.get_public_collection_stats(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.email_queue_dispatch() CASCADE;
DROP FUNCTION IF EXISTS public.email_queue_wake() CASCADE;

-- Drop view first
DROP VIEW IF EXISTS public.decks_public CASCADE;

-- Deck platform
DROP TABLE IF EXISTS public.deck_comments CASCADE;
DROP TABLE IF EXISTS public.deck_votes CASCADE;
DROP TABLE IF EXISTS public.deck_tags CASCADE;
DROP TABLE IF EXISTS public.deck_cards CASCADE;
DROP TABLE IF EXISTS public.decks CASCADE;

-- Collection
DROP TABLE IF EXISTS public.collection_cards CASCADE;

-- Email ops
DROP TABLE IF EXISTS public.email_send_log CASCADE;
DROP TABLE IF EXISTS public.email_send_state CASCADE;
DROP TABLE IF EXISTS public.email_unsubscribe_tokens CASCADE;
DROP TABLE IF EXISTS public.suppressed_emails CASCADE;

-- Instrumentation
DROP TABLE IF EXISTS public.ai_usage_logs CASCADE;

-- Watchlist features
DROP TABLE IF EXISTS public.price_alerts CASCADE;
DROP TABLE IF EXISTS public.user_notifications CASCADE;

-- Saved searches
DROP TABLE IF EXISTS public.saved_searches CASCADE;