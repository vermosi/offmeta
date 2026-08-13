CREATE TABLE IF NOT EXISTS public.job_dedupe (
  dedupe_key text PRIMARY KEY,
  decision jsonb NOT NULL DEFAULT '{}'::jsonb,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0
);

GRANT ALL ON public.job_dedupe TO service_role;

ALTER TABLE public.job_dedupe ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_job_dedupe_expires_at ON public.job_dedupe (expires_at);

CREATE OR REPLACE FUNCTION public.claim_dedupe_key(p_key text, p_ttl_seconds integer, p_decision jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.job_dedupe%ROWTYPE;
BEGIN
  INSERT INTO public.job_dedupe AS d (dedupe_key, decision, claimed_at, expires_at, hit_count)
  VALUES (p_key, coalesce(p_decision, '{}'::jsonb), now(), now() + make_interval(secs => greatest(p_ttl_seconds, 1)), 0)
  ON CONFLICT (dedupe_key) DO UPDATE
    SET decision = EXCLUDED.decision,
        claimed_at = now(),
        expires_at = EXCLUDED.expires_at,
        hit_count = 0
    WHERE d.expires_at < now()
  RETURNING * INTO v_row;

  IF FOUND THEN
    RETURN jsonb_build_object('claimed', true, 'expires_at', v_row.expires_at);
  END IF;

  UPDATE public.job_dedupe
    SET hit_count = hit_count + 1
    WHERE dedupe_key = p_key
    RETURNING * INTO v_row;

  RETURN jsonb_build_object(
    'claimed', false,
    'decision', coalesce(v_row.decision, '{}'::jsonb),
    'expires_at', v_row.expires_at,
    'hit_count', v_row.hit_count
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_dedupe_decision(p_key text, p_decision jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.job_dedupe
    SET decision = coalesce(p_decision, '{}'::jsonb)
    WHERE dedupe_key = p_key;
$$;

CREATE OR REPLACE FUNCTION public.prune_dedupe_and_locks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH d AS (DELETE FROM public.job_dedupe WHERE expires_at < now() - interval '1 day')
  DELETE FROM public.job_locks WHERE expires_at < now() - interval '1 day';
$$;