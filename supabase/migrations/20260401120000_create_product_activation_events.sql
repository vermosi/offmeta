-- Product activation lifecycle events (search-first funnel)
CREATE TABLE IF NOT EXISTS public.product_activation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL CHECK (
    event_name IN (
      'first_search_start',
      'first_search_success',
      'first_result_click',
      'first_refinement',
      'first_save',
      'first_return_visit'
    )
  ),
  query_text TEXT NULL,
  request_id TEXT NULL,
  source TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT product_activation_events_request_len CHECK (
    request_id IS NULL OR char_length(request_id) <= 100
  ),
  CONSTRAINT product_activation_events_query_len CHECK (
    query_text IS NULL OR char_length(query_text) <= 500
  )
);

CREATE INDEX IF NOT EXISTS idx_product_activation_events_event_name
  ON public.product_activation_events (event_name);

CREATE INDEX IF NOT EXISTS idx_product_activation_events_occurred_at
  ON public.product_activation_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_activation_events_session
  ON public.product_activation_events (session_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_activation_events_user
  ON public.product_activation_events (user_id, occurred_at DESC)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_activation_events_once_per_session
  ON public.product_activation_events (session_id, event_name)
  WHERE event_name IN (
    'first_search_start',
    'first_search_success',
    'first_result_click',
    'first_refinement',
    'first_save',
    'first_return_visit'
  );

ALTER TABLE public.product_activation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage product activation events"
  ON public.product_activation_events;
CREATE POLICY "Service role can manage product activation events"
  ON public.product_activation_events
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Admins can read product activation events"
  ON public.product_activation_events;
CREATE POLICY "Admins can read product activation events"
  ON public.product_activation_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
