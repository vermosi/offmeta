-- Remove deck_votes from realtime publication (no client subscriber exists)
ALTER PUBLICATION supabase_realtime DROP TABLE public.deck_votes;