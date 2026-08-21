CREATE TABLE public.recommendation_rollout_state_v2 (
  singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK (singleton),
  stage TEXT NOT NULL DEFAULT 'shadow'
    CHECK (stage IN ('shadow', '5', '25', '50', '100')),
  stage_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consecutive_guardrail_failures INTEGER NOT NULL DEFAULT 0
    CHECK (consecutive_guardrail_failures BETWEEN 0 AND 2),
  last_evaluated_hour TIMESTAMPTZ,
  assignment_salt TEXT NOT NULL DEFAULT 'recommendation-v2-20260816',
  baseline_requests BIGINT,
  baseline_useful_clicks BIGINT,
  baseline_immediate_refinements BIGINT,
  baseline_negative_feedback BIGINT,
  baseline_errors BIGINT,
  baseline_p95_latency_ms NUMERIC,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recommendation_rollout_audit_v2 (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  evaluation_hour TIMESTAMPTZ,
  from_stage TEXT NOT NULL CHECK (from_stage IN ('shadow', '5', '25', '50', '100')),
  to_stage TEXT NOT NULL CHECK (to_stage IN ('shadow', '5', '25', '50', '100')),
  action TEXT NOT NULL CHECK (action IN (
    'initialized', 'held', 'promoted', 'guardrail_failure', 'rolled_back'
  )),
  reason TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE TABLE public.recommendation_rollout_observations_v2 (
  request_id TEXT NOT NULL,
  subject_hash TEXT NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('shadow', '5', '25', '50', '100')),
  model_version TEXT NOT NULL CHECK (model_version IN ('baseline', 'v2')),
  useful_click BOOLEAN NOT NULL,
  immediate_refinement BOOLEAN NOT NULL,
  negative_feedback BOOLEAN NOT NULL,
  constraint_violation BOOLEAN NOT NULL,
  constraint_observed_at TIMESTAMPTZ,
  errored BOOLEAN NOT NULL,
  correctness_passed BOOLEAN,
  latency_ms INTEGER NOT NULL CHECK (latency_ms BETWEEN 0 AND 600000),
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, model_version)
);

CREATE INDEX recommendation_rollout_observations_v2_stage_time_idx
  ON public.recommendation_rollout_observations_v2 (stage, observed_at, model_version);

CREATE TABLE public.recommendation_rollout_hourly_metrics_v2 (
  hour TIMESTAMPTZ NOT NULL,
  stage TEXT NOT NULL CHECK (stage IN ('shadow', '5', '25', '50', '100')),
  model_version TEXT NOT NULL CHECK (model_version IN ('baseline', 'v2')),
  requests BIGINT NOT NULL,
  useful_clicks BIGINT NOT NULL,
  immediate_refinements BIGINT NOT NULL,
  negative_feedback BIGINT NOT NULL,
  constraint_violations BIGINT NOT NULL,
  errors BIGINT NOT NULL,
  correctness_evaluated BIGINT NOT NULL,
  correctness_failures BIGINT NOT NULL,
  p95_latency_ms NUMERIC,
  aggregated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hour, stage, model_version)
);

GRANT SELECT ON TABLE public.recommendation_rollout_state_v2 TO authenticated;
GRANT SELECT ON TABLE public.recommendation_rollout_audit_v2 TO authenticated;
GRANT SELECT ON TABLE public.recommendation_rollout_hourly_metrics_v2 TO authenticated;
GRANT ALL ON TABLE public.recommendation_rollout_state_v2 TO service_role;
GRANT ALL ON TABLE public.recommendation_rollout_audit_v2 TO service_role;
GRANT ALL ON TABLE public.recommendation_rollout_observations_v2 TO service_role;
GRANT ALL ON TABLE public.recommendation_rollout_hourly_metrics_v2 TO service_role;

ALTER TABLE public.recommendation_rollout_state_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_rollout_audit_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_rollout_observations_v2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_rollout_hourly_metrics_v2 ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read recommendation rollout state v2"
  ON public.recommendation_rollout_state_v2 FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins read recommendation rollout audit v2"
  ON public.recommendation_rollout_audit_v2 FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role));
CREATE POLICY "Admins read recommendation rollout metrics v2"
  ON public.recommendation_rollout_hourly_metrics_v2 FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role));

CREATE POLICY "Service role manages recommendation rollout state v2"
  ON public.recommendation_rollout_state_v2 FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages recommendation rollout audit v2"
  ON public.recommendation_rollout_audit_v2 FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages recommendation rollout observations v2"
  ON public.recommendation_rollout_observations_v2 FOR ALL TO service_role
  USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages recommendation rollout metrics v2"
  ON public.recommendation_rollout_hourly_metrics_v2 FOR ALL TO service_role
  USING (true) WITH CHECK (true);

INSERT INTO public.recommendation_rollout_state_v2 (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

INSERT INTO public.recommendation_rollout_audit_v2 (
  from_stage, to_stage, action, reason
)
SELECT 'shadow', 'shadow', 'initialized', 'V2 rollout control plane initialized'
WHERE NOT EXISTS (
  SELECT 1 FROM public.recommendation_rollout_audit_v2
  WHERE action = 'initialized'
);

CREATE FUNCTION public.get_recommendation_rollout_assignment_v2(
  p_subject_key TEXT
) RETURNS TABLE(
  stage TEXT,
  rollout_percent INTEGER,
  serve_version TEXT,
  run_shadow BOOLEAN,
  bucket INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  current_stage TEXT;
  salt TEXT;
  stage_percent INTEGER;
  assigned_bucket INTEGER;
BEGIN
  IF nullif(trim(p_subject_key), '') IS NULL OR length(p_subject_key) > 512 THEN
    RAISE EXCEPTION 'subject key must contain 1 to 512 characters'
      USING ERRCODE = '22023';
  END IF;

  SELECT state.stage, state.assignment_salt
  INTO current_stage, salt
  FROM public.recommendation_rollout_state_v2 state
  WHERE state.singleton;

  stage_percent := CASE current_stage
    WHEN 'shadow' THEN 0
    ELSE current_stage::INTEGER
  END;
  assigned_bucket := (
    ('x' || substr(md5(salt || ':' || p_subject_key), 1, 8))::BIT(32)::BIGINT
    % 10000
  )::INTEGER;

  RETURN QUERY SELECT
    current_stage,
    stage_percent,
    CASE WHEN assigned_bucket < stage_percent * 100 THEN 'v2' ELSE 'baseline' END,
    current_stage = 'shadow',
    assigned_bucket;
END;
$$;

CREATE FUNCTION public.record_recommendation_rollout_observation_v2(
  p_request_id TEXT,
  p_subject_key TEXT,
  p_model_version TEXT,
  p_latency_ms INTEGER,
  p_useful_click BOOLEAN DEFAULT false,
  p_immediate_refinement BOOLEAN DEFAULT false,
  p_negative_feedback BOOLEAN DEFAULT false,
  p_constraint_violation BOOLEAN DEFAULT false,
  p_errored BOOLEAN DEFAULT false,
  p_correctness_passed BOOLEAN DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  assignment RECORD;
  existing_observation public.recommendation_rollout_observations_v2%ROWTYPE;
  previous_stage TEXT;
BEGIN
  IF nullif(trim(p_request_id), '') IS NULL OR length(p_request_id) > 256 THEN
    RAISE EXCEPTION 'request id must contain 1 to 256 characters'
      USING ERRCODE = '22023';
  END IF;
  IF p_model_version NOT IN ('baseline', 'v2') THEN
    RAISE EXCEPTION 'model version must be baseline or v2'
      USING ERRCODE = '22023';
  END IF;
  IF p_latency_ms IS NULL OR p_latency_ms NOT BETWEEN 0 AND 600000 THEN
    RAISE EXCEPTION 'latency must be between 0 and 600000 milliseconds'
      USING ERRCODE = '22023';
  END IF;

  SELECT * INTO existing_observation
  FROM public.recommendation_rollout_observations_v2
  WHERE request_id = p_request_id
    AND model_version = p_model_version
  FOR UPDATE;

  IF FOUND THEN
    IF existing_observation.subject_hash
       <> md5(existing_observation.stage || ':' || p_subject_key) THEN
      RAISE EXCEPTION 'request id belongs to a different rollout subject'
        USING ERRCODE = '22023';
    END IF;
    UPDATE public.recommendation_rollout_observations_v2 SET
      useful_click = useful_click OR coalesce(p_useful_click, false),
      immediate_refinement = immediate_refinement OR coalesce(p_immediate_refinement, false),
      negative_feedback = negative_feedback OR coalesce(p_negative_feedback, false),
      constraint_observed_at = CASE
        WHEN constraint_observed_at IS NULL AND coalesce(p_constraint_violation, false)
          THEN now()
        ELSE constraint_observed_at
      END,
      constraint_violation = constraint_violation OR coalesce(p_constraint_violation, false),
      errored = errored OR coalesce(p_errored, false),
      correctness_passed = CASE
        WHEN correctness_passed IS NULL THEN p_correctness_passed
        WHEN p_correctness_passed IS NULL THEN correctness_passed
        ELSE correctness_passed AND p_correctness_passed
      END,
      latency_ms = LEAST(latency_ms, p_latency_ms)
    WHERE request_id = p_request_id
      AND model_version = p_model_version;
    IF p_model_version = 'v2'
       AND coalesce(p_constraint_violation, false)
       AND existing_observation.stage <> 'shadow' THEN
      previous_stage := CASE existing_observation.stage
        WHEN '100' THEN '50'
        WHEN '50' THEN '25'
        WHEN '25' THEN '5'
        ELSE 'shadow'
      END;
      UPDATE public.recommendation_rollout_state_v2 SET
        stage = previous_stage,
        stage_started_at = now(),
        consecutive_guardrail_failures = 0,
        updated_at = now()
      WHERE singleton AND stage = existing_observation.stage;
      IF FOUND THEN
        INSERT INTO public.recommendation_rollout_audit_v2 (
          from_stage, to_stage, action, reason, details
        ) VALUES (
          existing_observation.stage,
          previous_stage,
          'rolled_back',
          'Immediate rollback: served V2 constraint violation',
          jsonb_build_object('request_id', p_request_id)
        );
      END IF;
    END IF;
    RETURN;
  END IF;

  SELECT * INTO assignment
  FROM public.get_recommendation_rollout_assignment_v2(p_subject_key);

  IF assignment.stage <> 'shadow' AND p_model_version <> assignment.serve_version THEN
    RAISE EXCEPTION 'observation model does not match stable rollout assignment'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.recommendation_rollout_observations_v2 (
    request_id,
    subject_hash,
    stage,
    model_version,
    useful_click,
    immediate_refinement,
    negative_feedback,
    constraint_violation,
    constraint_observed_at,
    errored,
    correctness_passed,
    latency_ms
  ) VALUES (
    p_request_id,
    md5(assignment.stage || ':' || p_subject_key),
    assignment.stage,
    p_model_version,
    coalesce(p_useful_click, false),
    coalesce(p_immediate_refinement, false),
    coalesce(p_negative_feedback, false),
    coalesce(p_constraint_violation, false),
    CASE WHEN coalesce(p_constraint_violation, false) THEN now() END,
    coalesce(p_errored, false),
    p_correctness_passed,
    p_latency_ms
  )
  ON CONFLICT (request_id, model_version) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.get_recommendation_rollout_assignment_v2(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_recommendation_rollout_observation_v2(
  TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recommendation_rollout_assignment_v2(TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.record_recommendation_rollout_observation_v2(
  TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO service_role;