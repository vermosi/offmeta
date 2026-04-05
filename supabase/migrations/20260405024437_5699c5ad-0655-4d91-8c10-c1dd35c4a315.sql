-- Remove sensitive tables from Realtime publication
ALTER PUBLICATION supabase_realtime DROP TABLE public.translation_logs;
ALTER PUBLICATION supabase_realtime DROP TABLE public.analytics_events;
ALTER PUBLICATION supabase_realtime DROP TABLE public.search_feedback;
ALTER PUBLICATION supabase_realtime DROP TABLE public.translation_rules;

-- Fix deck_votes: replace overly permissive public SELECT with scoped policies
DROP POLICY IF EXISTS "Anyone can read vote counts" ON public.deck_votes;

-- Authenticated users can see their own votes
CREATE POLICY "Users can view own votes"
  ON public.deck_votes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);