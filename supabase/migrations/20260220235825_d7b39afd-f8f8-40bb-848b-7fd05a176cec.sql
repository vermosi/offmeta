
CREATE POLICY "Anyone can view public decks"
ON public.decks FOR SELECT
USING (is_public = true);
