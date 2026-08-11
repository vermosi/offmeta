CREATE TABLE IF NOT EXISTS public.rate_limits (
  ip TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages rate limits" ON public.rate_limits;
CREATE POLICY "Service role manages rate limits"
  ON public.rate_limits FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.increment_rate_limit(
  client_ip TEXT,
  limit_count INTEGER,
  window_seconds NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  win INTERVAL := make_interval(secs => GREATEST(window_seconds, 1));
  row_rec public.rate_limits%ROWTYPE;
BEGIN
  INSERT INTO public.rate_limits AS rl (ip, count, window_start)
  VALUES (client_ip, 1, now())
  ON CONFLICT (ip) DO UPDATE
    SET count = CASE WHEN now() - rl.window_start >= win THEN 1 ELSE rl.count + 1 END,
        window_start = CASE WHEN now() - rl.window_start >= win THEN now() ELSE rl.window_start END
  RETURNING * INTO row_rec;

  IF row_rec.count > GREATEST(limit_count, 1) THEN
    RETURN jsonb_build_object(
      'blocked', true,
      'retry_after', GREATEST(CEIL(EXTRACT(EPOCH FROM (row_rec.window_start + win - now())))::int, 1)
    );
  END IF;

  RETURN jsonb_build_object('blocked', false, 'retry_after', 0);
END;
$$;

REVOKE ALL ON FUNCTION public.increment_rate_limit(TEXT, INTEGER, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_rate_limit(TEXT, INTEGER, NUMERIC) TO service_role;

CREATE OR REPLACE FUNCTION public.prune_old_rate_limits()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
$$;