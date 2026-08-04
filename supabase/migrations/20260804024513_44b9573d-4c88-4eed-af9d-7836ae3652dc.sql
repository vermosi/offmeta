CREATE TABLE public.error_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  fingerprint TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  error_type TEXT NOT NULL,
  message TEXT NOT NULL,
  url TEXT,
  severity TEXT NOT NULL DEFAULT 'error',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'open',
  fix_attempts INTEGER NOT NULL DEFAULT 0,
  last_fix_at TIMESTAMPTZ,
  last_fix_result JSONB,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.error_events TO authenticated;
GRANT ALL ON public.error_events TO service_role;

ALTER TABLE public.error_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read error events"
  ON public.error_events FOR SELECT TO authenticated
  USING (public.has_role('admin'));

CREATE POLICY "Admins can update error events"
  ON public.error_events FOR UPDATE TO authenticated
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

CREATE INDEX idx_error_events_status_last_seen
  ON public.error_events (status, last_seen_at DESC);
CREATE INDEX idx_error_events_source
  ON public.error_events (source, last_seen_at DESC);

CREATE TRIGGER update_error_events_updated_at
  BEFORE UPDATE ON public.error_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.validate_error_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF length(NEW.error_type) > 120 THEN
    RAISE EXCEPTION 'error_type exceeds 120 character limit';
  END IF;
  IF length(NEW.message) > 2000 THEN
    NEW.message := left(NEW.message, 2000);
  END IF;
  IF NEW.url IS NOT NULL AND length(NEW.url) > 1000 THEN
    NEW.url := left(NEW.url, 1000);
  END IF;
  IF length(NEW.context::text) > 10000 THEN
    RAISE EXCEPTION 'context exceeds 10KB limit';
  END IF;
  IF NEW.severity NOT IN ('info', 'warning', 'error', 'critical') THEN
    RAISE EXCEPTION 'invalid severity';
  END IF;
  IF NEW.status NOT IN ('open', 'repairing', 'repaired', 'failed', 'ignored') THEN
    RAISE EXCEPTION 'invalid status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_error_event_before_write
  BEFORE INSERT OR UPDATE ON public.error_events
  FOR EACH ROW EXECUTE FUNCTION public.validate_error_event();

-- Public ingest: deduplicates by fingerprint, never exposes stored rows.
CREATE OR REPLACE FUNCTION public.report_error_event(
  p_source TEXT,
  p_error_type TEXT,
  p_message TEXT,
  p_url TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'error',
  p_context JSONB DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  fp TEXT;
BEGIN
  IF coalesce(trim(p_message), '') = '' THEN
    RETURN;
  END IF;

  fp := md5(
    lower(coalesce(p_source, 'unknown')) || '|' ||
    lower(coalesce(p_error_type, 'unknown')) || '|' ||
    left(lower(trim(p_message)), 300) || '|' ||
    coalesce(split_part(p_url, '?', 1), '')
  );

  INSERT INTO public.error_events (
    fingerprint, source, error_type, message, url, severity, context
  ) VALUES (
    fp,
    coalesce(p_source, 'unknown'),
    coalesce(p_error_type, 'unknown'),
    p_message,
    p_url,
    coalesce(p_severity, 'error'),
    coalesce(p_context, '{}'::jsonb)
  )
  ON CONFLICT (fingerprint) DO UPDATE SET
    occurrence_count = public.error_events.occurrence_count + 1,
    last_seen_at = now(),
    context = EXCLUDED.context,
    -- A repaired error that recurs is open again so the fixer retries it.
    status = CASE
      WHEN public.error_events.status IN ('repaired', 'failed') THEN 'open'
      ELSE public.error_events.status
    END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.report_error_event(TEXT, TEXT, TEXT, TEXT, TEXT, JSONB) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_error_monitor_summary(days_back INTEGER DEFAULT 7)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  since TIMESTAMPTZ := now() - make_interval(days => greatest(days_back, 1));
  by_status JSONB;
  top_open JSONB;
  repaired_count INTEGER;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT jsonb_object_agg(status, cnt) INTO by_status
  FROM (
    SELECT status, COUNT(*) AS cnt
    FROM public.error_events
    WHERE last_seen_at >= since
    GROUP BY status
  ) s;

  SELECT jsonb_agg(row_to_json(t)) INTO top_open
  FROM (
    SELECT id, source, error_type, message, url, severity,
           occurrence_count, status, fix_attempts, last_fix_result, last_seen_at
    FROM public.error_events
    WHERE status IN ('open', 'repairing', 'failed')
      AND last_seen_at >= since
    ORDER BY occurrence_count DESC, last_seen_at DESC
    LIMIT 25
  ) t;

  SELECT COUNT(*)::int INTO repaired_count
  FROM public.error_events
  WHERE status = 'repaired' AND last_fix_at >= since;

  RETURN jsonb_build_object(
    'since', since,
    'by_status', COALESCE(by_status, '{}'::jsonb),
    'top_open', COALESCE(top_open, '[]'::jsonb),
    'auto_repaired', repaired_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.prune_old_error_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.error_events
  WHERE status = 'repaired' AND last_seen_at < now() - interval '30 days';
$$;