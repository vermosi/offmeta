
-- New table for deck tags
CREATE TABLE public.deck_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id uuid NOT NULL REFERENCES public.decks(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (deck_id, tag)
);

-- Validate tag length and count via trigger
CREATE OR REPLACE FUNCTION public.validate_deck_tag()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF length(NEW.tag) > 30 THEN
    RAISE EXCEPTION 'Tag exceeds 30 character limit';
  END IF;
  IF (SELECT count(*) FROM public.deck_tags WHERE deck_id = NEW.deck_id) >= 5 THEN
    RAISE EXCEPTION 'Maximum 5 tags per deck';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_deck_tag_trigger
  BEFORE INSERT ON public.deck_tags
  FOR EACH ROW EXECUTE FUNCTION public.validate_deck_tag();

-- RLS
ALTER TABLE public.deck_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tags on public decks"
  ON public.deck_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.decks WHERE decks.id = deck_tags.deck_id AND decks.is_public = true
  ));

CREATE POLICY "Users can view tags on own decks"
  ON public.deck_tags FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.decks WHERE decks.id = deck_tags.deck_id AND decks.user_id = auth.uid()
  ));

CREATE POLICY "Users can add tags to own decks"
  ON public.deck_tags FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.decks WHERE decks.id = deck_tags.deck_id AND decks.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete tags from own decks"
  ON public.deck_tags FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.decks WHERE decks.id = deck_tags.deck_id AND decks.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_deck_tags_deck_id ON public.deck_tags(deck_id);
CREATE INDEX idx_deck_tags_tag ON public.deck_tags(tag);
