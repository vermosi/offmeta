-- SEO health check table + admin RPC
CREATE TABLE public.seo_health_checks (
  id BIGSERIAL PRIMARY KEY,
  ran_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  check_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  details JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX idx_seo_health_checks_ran_at ON public.seo_health_checks (ran_at DESC);
CREATE INDEX idx_seo_health_checks_failing ON public.seo_health_checks (ran_at DESC) WHERE passed = false;

GRANT SELECT ON public.seo_health_checks TO authenticated;
GRANT ALL ON public.seo_health_checks TO service_role;

ALTER TABLE public.seo_health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read seo health"
  ON public.seo_health_checks FOR SELECT
  TO authenticated
  USING (public.has_role('admin'));

-- Retention: prune anything older than 60 days
CREATE OR REPLACE FUNCTION public.prune_old_seo_health_checks()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  DELETE FROM public.seo_health_checks WHERE ran_at < now() - interval '60 days';
$$;

-- Admin summary: last run + rolling 7d failure counts by check_type
CREATE OR REPLACE FUNCTION public.get_seo_health_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  last_run_ts TIMESTAMPTZ;
  latest_results JSONB;
  recent_failures JSONB;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  SELECT MAX(ran_at) INTO last_run_ts FROM public.seo_health_checks;

  SELECT jsonb_agg(row_to_json(r) ORDER BY r.severity_rank DESC, r.target_url)
    INTO latest_results
    FROM (
      SELECT
        target_url,
        check_type,
        passed,
        severity,
        details,
        CASE severity WHEN 'critical' THEN 3 WHEN 'warning' THEN 2 ELSE 1 END AS severity_rank
      FROM public.seo_health_checks
      WHERE ran_at = last_run_ts
    ) r;

  SELECT jsonb_agg(row_to_json(f))
    INTO recent_failures
    FROM (
      SELECT
        check_type,
        target_url,
        severity,
        COUNT(*) AS failures,
        MAX(ran_at) AS last_failure_at
      FROM public.seo_health_checks
      WHERE passed = false
        AND ran_at > now() - interval '7 days'
      GROUP BY check_type, target_url, severity
      ORDER BY MAX(ran_at) DESC
    ) f;

  RETURN jsonb_build_object(
    'last_run', last_run_ts,
    'latest_results', COALESCE(latest_results, '[]'::jsonb),
    'recent_failures', COALESCE(recent_failures, '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_seo_health_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.prune_old_seo_health_checks() TO service_role;