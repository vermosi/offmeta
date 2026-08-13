-- ── Job leases: one live run per job name, self-expiring ──────────────
CREATE TABLE IF NOT EXISTS public.job_locks (
  job_name   text PRIMARY KEY,
  holder     text NOT NULL,
  locked_at  timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

GRANT ALL ON public.job_locks TO service_role;
ALTER TABLE public.job_locks ENABLE ROW LEVEL SECURITY;

-- Atomically take a lease. Returns false when another holder still owns it.
CREATE OR REPLACE FUNCTION public.try_acquire_job_lock(
  p_job text,
  p_holder text,
  p_ttl_seconds integer DEFAULT 300
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acquired boolean;
BEGIN
  INSERT INTO public.job_locks (job_name, holder, locked_at, expires_at)
  VALUES (p_job, p_holder, now(), now() + make_interval(secs => greatest(p_ttl_seconds, 5)))
  ON CONFLICT (job_name) DO UPDATE
    SET holder = EXCLUDED.holder,
        locked_at = EXCLUDED.locked_at,
        expires_at = EXCLUDED.expires_at
    WHERE public.job_locks.expires_at < now()
  RETURNING true INTO v_acquired;

  RETURN coalesce(v_acquired, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_job_lock(p_job text, p_holder text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.job_locks WHERE job_name = p_job AND holder = p_holder;
$$;

REVOKE ALL ON FUNCTION public.try_acquire_job_lock(text, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_job_lock(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.try_acquire_job_lock(text, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_job_lock(text, text) TO service_role;

-- ── Per-issue backoff so one failing row can't be reprocessed every cycle ──
ALTER TABLE public.error_events
  ADD COLUMN IF NOT EXISTS next_attempt_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_error_events_due
  ON public.error_events (next_attempt_at)
  WHERE status IN ('open', 'failed', 'repairing');