-- Drop the original NO ACTION FK that was created by a previous migration,
-- leaving only the SET NULL one we own.
ALTER TABLE public.search_feedback
  DROP CONSTRAINT IF EXISTS search_feedback_generated_rule_id_fkey;