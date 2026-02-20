ALTER TABLE public.search_feedback
  ADD COLUMN IF NOT EXISTS scryfall_validation_count integer NULL;