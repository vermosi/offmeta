CREATE OR REPLACE FUNCTION public.get_deck_vote_count(target_deck_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::integer FROM public.deck_votes WHERE deck_id = target_deck_id;
$$;