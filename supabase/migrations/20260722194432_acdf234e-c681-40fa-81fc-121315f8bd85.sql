
CREATE OR REPLACE FUNCTION public.get_edge_function_status()
RETURNS TABLE(
  jobid bigint,
  jobname text,
  function_name text,
  schedule text,
  active boolean,
  last_run_at timestamptz,
  last_run_status text,
  last_return_message text,
  last_http_status_code integer,
  last_http_error text,
  last_http_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;

  RETURN QUERY
  WITH jobs AS (
    SELECT
      j.jobid,
      j.jobname,
      j.schedule,
      j.active,
      (regexp_match(j.command, 'functions/v1/([a-zA-Z0-9_-]+)'))[1] AS function_name
    FROM cron.job j
  ),
  last_run AS (
    SELECT DISTINCT ON (d.jobid)
      d.jobid,
      d.start_time,
      d.status,
      d.return_message
    FROM cron.job_run_details d
    ORDER BY d.jobid, d.start_time DESC
  ),
  last_http AS (
    SELECT DISTINCT ON (fn)
      fn,
      r.status_code,
      r.error_msg,
      r.created
    FROM (
      SELECT
        (regexp_match(q.url, 'functions/v1/([a-zA-Z0-9_-]+)'))[1] AS fn,
        r.status_code,
        r.error_msg,
        r.created
      FROM net._http_response r
      JOIN net.http_request_queue q ON q.id = r.id
      WHERE r.created > now() - interval '30 days'
      UNION ALL
      -- http_request_queue rows may be pruned; also look at responses directly via response headers when available
      SELECT NULL::text, NULL::int, NULL::text, NULL::timestamptz WHERE false
    ) r
    WHERE fn IS NOT NULL
    ORDER BY fn, r.created DESC
  )
  SELECT
    j.jobid,
    j.jobname,
    j.function_name,
    j.schedule,
    j.active,
    lr.start_time,
    lr.status,
    lr.return_message,
    lh.status_code,
    lh.error_msg,
    lh.created
  FROM jobs j
  LEFT JOIN last_run lr ON lr.jobid = j.jobid
  LEFT JOIN last_http lh ON lh.fn = j.function_name
  ORDER BY j.jobname;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_edge_function_status() TO authenticated;
