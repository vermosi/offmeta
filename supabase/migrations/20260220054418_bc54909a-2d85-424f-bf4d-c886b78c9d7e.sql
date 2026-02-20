-- Re-add the FK that PostgREST needs to traverse the embedded join
-- (search_feedback.generated_rule_id → translation_rules.id, ON DELETE SET NULL)
-- Idempotent: drop first in case a partial version exists
ALTER TABLE public.search_feedback
  DROP CONSTRAINT IF EXISTS fk_search_feedback_generated_rule;

ALTER TABLE public.search_feedback
  ADD CONSTRAINT fk_search_feedback_generated_rule
  FOREIGN KEY (generated_rule_id)
  REFERENCES public.translation_rules(id)
  ON DELETE SET NULL;

-- Ensure the admin SELECT policy is explicitly on the 'authenticated' role
-- so PostgREST honours it for embedded selects in the join.
-- Drop the existing public-role policy and recreate scoped to authenticated.
DROP POLICY IF EXISTS "Admins can read translation rules" ON public.translation_rules;
DROP POLICY IF EXISTS "Admins can update translation rules" ON public.translation_rules;

CREATE POLICY "Admins can read translation rules"
  ON public.translation_rules
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update translation rules"
  ON public.translation_rules
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));