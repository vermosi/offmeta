ALTER TABLE public.search_feedback
  ADD CONSTRAINT fk_search_feedback_generated_rule
  FOREIGN KEY (generated_rule_id)
  REFERENCES public.translation_rules(id)
  ON DELETE SET NULL;