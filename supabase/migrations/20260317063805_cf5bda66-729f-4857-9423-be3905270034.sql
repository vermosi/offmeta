
-- AI usage tracking table for cost monitoring
CREATE TABLE public.ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  model text NOT NULL,
  function_name text NOT NULL,
  prompt_tokens integer NOT NULL DEFAULT 0,
  completion_tokens integer NOT NULL DEFAULT 0,
  total_tokens integer NOT NULL DEFAULT 0,
  duration_ms integer NOT NULL DEFAULT 0,
  retries integer NOT NULL DEFAULT 0
);

-- RLS: only service role can insert, admins can read
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert ai usage"
  ON public.ai_usage_logs FOR INSERT
  TO public
  WITH CHECK (auth.role() = 'service_role'::text);

CREATE POLICY "Service role can read ai usage"
  ON public.ai_usage_logs FOR SELECT
  TO public
  USING (auth.role() = 'service_role'::text);

CREATE POLICY "Admins can read ai usage"
  ON public.ai_usage_logs FOR SELECT
  TO authenticated
  USING (public.has_role('admin'::app_role));

-- Index for time-based queries
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs (created_at DESC);

-- Aggregation RPC for the admin dashboard
CREATE OR REPLACE FUNCTION public.get_ai_usage_stats(days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  since_ts timestamptz;
  result jsonb;
BEGIN
  IF NOT public.has_role('admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required';
  END IF;

  since_ts := now() - make_interval(days => days_back);

  WITH by_model AS (
    SELECT
      model,
      count(*) AS request_count,
      sum(prompt_tokens) AS prompt_tokens,
      sum(completion_tokens) AS completion_tokens,
      sum(total_tokens) AS total_tokens,
      round(avg(duration_ms)) AS avg_duration_ms,
      sum(retries) AS total_retries
    FROM ai_usage_logs
    WHERE created_at >= since_ts
    GROUP BY model
    ORDER BY sum(total_tokens) DESC
  ),
  by_function AS (
    SELECT
      function_name,
      count(*) AS request_count,
      sum(total_tokens) AS total_tokens,
      round(avg(duration_ms)) AS avg_duration_ms
    FROM ai_usage_logs
    WHERE created_at >= since_ts
    GROUP BY function_name
    ORDER BY sum(total_tokens) DESC
  ),
  daily AS (
    SELECT
      created_at::date::text AS day,
      sum(total_tokens) AS tokens,
      count(*) AS requests
    FROM ai_usage_logs
    WHERE created_at >= since_ts
    GROUP BY created_at::date
    ORDER BY created_at::date
  ),
  totals AS (
    SELECT
      count(*) AS total_requests,
      coalesce(sum(total_tokens), 0) AS total_tokens,
      coalesce(sum(prompt_tokens), 0) AS total_prompt_tokens,
      coalesce(sum(completion_tokens), 0) AS total_completion_tokens,
      round(coalesce(avg(duration_ms), 0)) AS avg_duration_ms,
      coalesce(sum(retries), 0) AS total_retries
    FROM ai_usage_logs
    WHERE created_at >= since_ts
  )
  SELECT jsonb_build_object(
    'summary', (SELECT row_to_json(t) FROM totals t),
    'byModel', coalesce((SELECT jsonb_agg(row_to_json(m)) FROM by_model m), '[]'::jsonb),
    'byFunction', coalesce((SELECT jsonb_agg(row_to_json(f)) FROM by_function f), '[]'::jsonb),
    'daily', coalesce((SELECT jsonb_agg(row_to_json(d)) FROM daily d), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;
