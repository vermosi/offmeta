
-- analytics_events: replace WITH CHECK (true) with concrete payload constraints
DROP POLICY IF EXISTS "Anyone can insert analytics events" ON public.analytics_events;

CREATE POLICY "Anyone can insert analytics events"
ON public.analytics_events
FOR INSERT
TO public
WITH CHECK (
  event_type IS NOT NULL
  AND length(trim(event_type)) BETWEEN 1 AND 100
  AND (session_id IS NULL OR length(session_id) <= 200)
  AND length(event_data::text) <= 10000
);

-- search_feedback: replace WITH CHECK (true) with concrete payload constraints
DROP POLICY IF EXISTS "Anyone can insert feedback" ON public.search_feedback;

CREATE POLICY "Anyone can insert feedback"
ON public.search_feedback
FOR INSERT
TO public
WITH CHECK (
  original_query IS NOT NULL
  AND length(trim(original_query)) BETWEEN 1 AND 500
  AND issue_description IS NOT NULL
  AND length(trim(issue_description)) BETWEEN 1 AND 2000
  AND (translated_query IS NULL OR length(translated_query) <= 1000)
);
