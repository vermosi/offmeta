
-- ============================================================
-- Priority 1 Migration: Archive support + indexes + security fixes
-- ============================================================

-- 1. Add archived_at column to translation_rules
ALTER TABLE public.translation_rules
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Partial index to speed up active-rule queries (WHERE archived_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_translation_rules_archived
  ON public.translation_rules (archived_at)
  WHERE archived_at IS NULL;

-- 3. Partial index on source_feedback_id FK for admin panel JOINs
CREATE INDEX IF NOT EXISTS idx_translation_rules_source_feedback_id
  ON public.translation_rules (source_feedback_id)
  WHERE source_feedback_id IS NOT NULL;

-- 4. Composite index on search_feedback for status-filtered, time-ordered queries
CREATE INDEX IF NOT EXISTS idx_search_feedback_status
  ON public.search_feedback (processing_status, created_at DESC);

-- 5. Index on search_feedback.created_at for ORDER BY without status filter
CREATE INDEX IF NOT EXISTS idx_search_feedback_created
  ON public.search_feedback (created_at DESC);

-- 6. Make confidence NOT NULL (column already has DEFAULT 0.8; backfill NULLs first)
UPDATE public.translation_rules
  SET confidence = 0.8
  WHERE confidence IS NULL;

ALTER TABLE public.translation_rules
  ALTER COLUMN confidence SET NOT NULL,
  ALTER COLUMN confidence SET DEFAULT 0.8;

-- 7. Fix service_role_all_feedback: narrow USING from 'true' → auth.role() = 'service_role'
DROP POLICY IF EXISTS "service_role_all_feedback" ON public.search_feedback;
CREATE POLICY "service_role_all_feedback"
  ON public.search_feedback
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 8. Add WITH CHECK to deck_cards UPDATE policy to prevent deck_id reassignment
DROP POLICY IF EXISTS "Users can update cards in own decks" ON public.deck_cards;
CREATE POLICY "Users can update cards in own decks"
  ON public.deck_cards
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.decks
    WHERE decks.id = deck_cards.deck_id
      AND decks.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.decks
    WHERE decks.id = deck_cards.deck_id
      AND decks.user_id = auth.uid()
  ));
