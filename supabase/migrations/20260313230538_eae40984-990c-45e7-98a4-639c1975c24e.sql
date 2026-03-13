
-- Deck votes (one vote per user per deck)
CREATE TABLE public.deck_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deck_id, user_id)
);

ALTER TABLE public.deck_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vote counts" ON public.deck_votes
  FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated users can vote" ON public.deck_votes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own vote" ON public.deck_votes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_deck_votes_deck_id ON public.deck_votes(deck_id);

-- Deck comments
CREATE TABLE public.deck_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.deck_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments on public decks" ON public.deck_comments
  FOR SELECT TO public
  USING (EXISTS (SELECT 1 FROM decks WHERE decks.id = deck_comments.deck_id AND decks.is_public = true));

CREATE POLICY "Authenticated users can comment" ON public.deck_comments
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.deck_comments
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.deck_comments
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admins can delete any comment
CREATE POLICY "Admins can delete comments" ON public.deck_comments
  FOR DELETE TO authenticated
  USING (public.has_role('admin'::app_role));

CREATE INDEX idx_deck_comments_deck_id ON public.deck_comments(deck_id);
CREATE INDEX idx_deck_comments_user_id ON public.deck_comments(user_id);

-- Validation trigger for comments
CREATE OR REPLACE FUNCTION public.validate_deck_comment()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $$
BEGIN
  IF length(TRIM(NEW.body)) < 1 THEN
    RAISE EXCEPTION 'Comment body cannot be empty';
  END IF;
  IF length(NEW.body) > 2000 THEN
    RAISE EXCEPTION 'Comment body exceeds 2000 character limit';
  END IF;
  -- Max 100 comments per user per deck
  IF TG_OP = 'INSERT' THEN
    IF (SELECT count(*) FROM public.deck_comments WHERE user_id = NEW.user_id AND deck_id = NEW.deck_id) >= 100 THEN
      RAISE EXCEPTION 'Maximum 100 comments per user per deck';
    END IF;
  END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_deck_comment
  BEFORE INSERT OR UPDATE ON public.deck_comments
  FOR EACH ROW EXECUTE FUNCTION public.validate_deck_comment();

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.deck_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deck_comments;
