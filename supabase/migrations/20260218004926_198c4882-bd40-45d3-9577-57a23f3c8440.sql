
-- Allow anonymous users (is_anonymous = true in JWT) to manage their own decks and cards.
-- Supabase anonymous sign-in sets auth.uid() just like regular auth, so existing
-- user_id = auth.uid() policies already work. We just need to ensure the policies
-- don't filter out anon role. Drop any role-restricted policies and recreate them
-- to cover both 'authenticated' and 'anon' roles.

-- Decks: drop existing policies and recreate without role restriction
DROP POLICY IF EXISTS "Users can view own decks" ON public.decks;
DROP POLICY IF EXISTS "Users can create own decks" ON public.decks;
DROP POLICY IF EXISTS "Users can update own decks" ON public.decks;
DROP POLICY IF EXISTS "Users can delete own decks" ON public.decks;
DROP POLICY IF EXISTS "Public decks are viewable by everyone" ON public.decks;

CREATE POLICY "Users can view own decks"
  ON public.decks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Public decks are viewable by everyone"
  ON public.decks FOR SELECT
  USING (is_public = true);

CREATE POLICY "Users can create own decks"
  ON public.decks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own decks"
  ON public.decks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own decks"
  ON public.decks FOR DELETE
  USING (auth.uid() = user_id);

-- Deck cards: recreate without role restriction
DROP POLICY IF EXISTS "Users can view own deck cards" ON public.deck_cards;
DROP POLICY IF EXISTS "Users can add cards to own decks" ON public.deck_cards;
DROP POLICY IF EXISTS "Users can update own deck cards" ON public.deck_cards;
DROP POLICY IF EXISTS "Users can delete own deck cards" ON public.deck_cards;

CREATE POLICY "Users can view own deck cards"
  ON public.deck_cards FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.decks WHERE decks.id = deck_cards.deck_id AND decks.user_id = auth.uid()));

CREATE POLICY "Users can add cards to own decks"
  ON public.deck_cards FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.decks WHERE decks.id = deck_cards.deck_id AND decks.user_id = auth.uid()));

CREATE POLICY "Users can update own deck cards"
  ON public.deck_cards FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.decks WHERE decks.id = deck_cards.deck_id AND decks.user_id = auth.uid()));

CREATE POLICY "Users can delete own deck cards"
  ON public.deck_cards FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.decks WHERE decks.id = deck_cards.deck_id AND decks.user_id = auth.uid()));
