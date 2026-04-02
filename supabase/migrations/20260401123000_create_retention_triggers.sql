-- Retention triggers and in-app notification queue
CREATE TABLE IF NOT EXISTS public.retention_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (
    trigger_type IN (
      'saved_search_updated',
      'price_change_detected',
      'new_card_match',
      'deck_gap_detected'
    )
  ),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dispatched BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_retention_triggers_user_created
  ON public.retention_triggers (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_retention_triggers_pending
  ON public.retention_triggers (dispatched, created_at DESC)
  WHERE dispatched = false;

ALTER TABLE public.retention_triggers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own retention triggers" ON public.retention_triggers;
CREATE POLICY "Users can read own retention triggers"
  ON public.retention_triggers FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage retention triggers" ON public.retention_triggers;
CREATE POLICY "Service role can manage retention triggers"
  ON public.retention_triggers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
