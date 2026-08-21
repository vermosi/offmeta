-- Automatic rollout control plane for recommendation ranker V2.
-- Promotions require 500 observations per comparable arm and 48 hours at a
-- stage. Safety checks run hourly; constraints always fail closed immediately.

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

-- A deterministic 10,000-bucket assignment keeps a subject in the same arm
-- while stages expand. Shadow subjects are served baseline and also run V2.
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

-- Intake is idempotent per request and model arm. In shadow both baseline and
-- V2 may report; in canary stages only the assigned serving arm is accepted.
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

  -- Outcome events can arrive after the response, including after a stage
  -- transition. Merge them into the request's original stage and hour.
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
  IF assignment.stage = 'shadow'
     AND p_model_version = 'v2'
     AND p_correctness_passed IS NULL THEN
    RAISE EXCEPTION 'shadow V2 observations require correctness_passed'
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
  ON CONFLICT (request_id, model_version) DO UPDATE SET
    useful_click = public.recommendation_rollout_observations_v2.useful_click
      OR EXCLUDED.useful_click,
    immediate_refinement = public.recommendation_rollout_observations_v2.immediate_refinement
      OR EXCLUDED.immediate_refinement,
    negative_feedback = public.recommendation_rollout_observations_v2.negative_feedback
      OR EXCLUDED.negative_feedback,
    constraint_violation = public.recommendation_rollout_observations_v2.constraint_violation
      OR EXCLUDED.constraint_violation,
    constraint_observed_at = coalesce(
      public.recommendation_rollout_observations_v2.constraint_observed_at,
      EXCLUDED.constraint_observed_at
    ),
    errored = public.recommendation_rollout_observations_v2.errored OR EXCLUDED.errored,
    correctness_passed = CASE
      WHEN public.recommendation_rollout_observations_v2.correctness_passed IS NULL
        THEN EXCLUDED.correctness_passed
      WHEN EXCLUDED.correctness_passed IS NULL
        THEN public.recommendation_rollout_observations_v2.correctness_passed
      ELSE public.recommendation_rollout_observations_v2.correctness_passed
        AND EXCLUDED.correctness_passed
    END,
    latency_ms = LEAST(
      public.recommendation_rollout_observations_v2.latency_ms,
      EXCLUDED.latency_ms
    )
  WHERE public.recommendation_rollout_observations_v2.subject_hash = EXCLUDED.subject_hash
    AND public.recommendation_rollout_observations_v2.stage = EXCLUDED.stage;

  IF p_model_version = 'v2'
     AND coalesce(p_constraint_violation, false)
     AND assignment.stage <> 'shadow' THEN
    previous_stage := CASE assignment.stage
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
    WHERE singleton AND stage = assignment.stage;
    IF FOUND THEN
      INSERT INTO public.recommendation_rollout_audit_v2 (
        from_stage, to_stage, action, reason, details
      ) VALUES (
        assignment.stage,
        previous_stage,
        'rolled_back',
        'Immediate rollback: served V2 constraint violation',
        jsonb_build_object('request_id', p_request_id)
      );
    END IF;
  END IF;
END;
$$;

CREATE FUNCTION public.aggregate_recommendation_rollout_hour_v2(
  p_hour TIMESTAMPTZ DEFAULT date_trunc('hour', now()) - INTERVAL '1 hour'
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  target_hour TIMESTAMPTZ := date_trunc('hour', p_hour);
BEGIN
  IF target_hour >= date_trunc('hour', now()) THEN
    RAISE EXCEPTION 'only completed hours may be aggregated'
      USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.recommendation_rollout_hourly_metrics_v2 (
    hour,
    stage,
    model_version,
    requests,
    useful_clicks,
    immediate_refinements,
    negative_feedback,
    constraint_violations,
    errors,
    correctness_evaluated,
    correctness_failures,
    p95_latency_ms,
    aggregated_at
  )
  SELECT
    target_hour,
    observations.stage,
    observations.model_version,
    count(*),
    count(*) FILTER (WHERE observations.useful_click),
    count(*) FILTER (WHERE observations.immediate_refinement),
    count(*) FILTER (WHERE observations.negative_feedback),
    count(*) FILTER (WHERE observations.constraint_violation),
    count(*) FILTER (WHERE observations.errored),
    count(*) FILTER (WHERE observations.correctness_passed IS NOT NULL),
    count(*) FILTER (WHERE observations.correctness_passed = false),
    percentile_cont(0.95) WITHIN GROUP (ORDER BY observations.latency_ms),
    now()
  FROM public.recommendation_rollout_observations_v2 observations
  WHERE observations.observed_at >= target_hour
    AND observations.observed_at < target_hour + INTERVAL '1 hour'
  GROUP BY observations.stage, observations.model_version
  ON CONFLICT (hour, stage, model_version) DO UPDATE SET
    requests = EXCLUDED.requests,
    useful_clicks = EXCLUDED.useful_clicks,
    immediate_refinements = EXCLUDED.immediate_refinements,
    negative_feedback = EXCLUDED.negative_feedback,
    constraint_violations = EXCLUDED.constraint_violations,
    errors = EXCLUDED.errors,
    correctness_evaluated = EXCLUDED.correctness_evaluated,
    correctness_failures = EXCLUDED.correctness_failures,
    p95_latency_ms = EXCLUDED.p95_latency_ms,
    aggregated_at = now();
END;
$$;

-- Standard normal CDF using the Abramowitz-Stegun 7.1.26 approximation.
CREATE FUNCTION public.recommendation_rollout_normal_cdf_v2(p_z DOUBLE PRECISION)
RETURNS DOUBLE PRECISION
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path TO public
AS $$
DECLARE
  z_abs DOUBLE PRECISION := abs(p_z);
  t DOUBLE PRECISION;
  density DOUBLE PRECISION;
  probability DOUBLE PRECISION;
BEGIN
  t := 1 / (1 + 0.2316419 * z_abs);
  density := 0.3989422804014327 * exp(-0.5 * z_abs * z_abs);
  probability := 1 - density * t * (
    0.319381530 + t * (-0.356563782 + t * (
      1.781477937 + t * (-1.821255978 + t * 1.330274429)
    ))
  );
  RETURN CASE WHEN p_z >= 0 THEN probability ELSE 1 - probability END;
END;
$$;

-- Beta(1,1) posteriors are compared through the posterior difference's normal
-- approximation. The 500-observation gate keeps this approximation calibrated.
CREATE FUNCTION public.recommendation_rollout_noninferiority_probability_v2(
  p_v2_successes BIGINT,
  p_v2_trials BIGINT,
  p_baseline_successes BIGINT,
  p_baseline_trials BIGINT,
  p_margin NUMERIC,
  p_higher_is_better BOOLEAN
) RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
STRICT
SET search_path TO public
AS $$
DECLARE
  v2_alpha NUMERIC := p_v2_successes + 1;
  v2_beta NUMERIC := p_v2_trials - p_v2_successes + 1;
  baseline_alpha NUMERIC := p_baseline_successes + 1;
  baseline_beta NUMERIC := p_baseline_trials - p_baseline_successes + 1;
  v2_mean NUMERIC;
  baseline_mean NUMERIC;
  posterior_variance NUMERIC;
  z_score DOUBLE PRECISION;
BEGIN
  IF p_v2_trials <= 0 OR p_baseline_trials <= 0
     OR p_v2_successes NOT BETWEEN 0 AND p_v2_trials
     OR p_baseline_successes NOT BETWEEN 0 AND p_baseline_trials
     OR p_margin < 0 THEN
    RAISE EXCEPTION 'invalid Bayesian noninferiority inputs'
      USING ERRCODE = '22023';
  END IF;

  v2_mean := v2_alpha / (v2_alpha + v2_beta);
  baseline_mean := baseline_alpha / (baseline_alpha + baseline_beta);
  posterior_variance :=
    (v2_alpha * v2_beta)
      / (power(v2_alpha + v2_beta, 2) * (v2_alpha + v2_beta + 1))
    + (baseline_alpha * baseline_beta)
      / (power(baseline_alpha + baseline_beta, 2)
        * (baseline_alpha + baseline_beta + 1));

  z_score := CASE WHEN p_higher_is_better THEN
    ((v2_mean - baseline_mean + p_margin) / sqrt(posterior_variance))::DOUBLE PRECISION
  ELSE
    ((baseline_mean - v2_mean + p_margin) / sqrt(posterior_variance))::DOUBLE PRECISION
  END;
  RETURN round(public.recommendation_rollout_normal_cdf_v2(z_score)::NUMERIC, 6);
END;
$$;

CREATE FUNCTION public.evaluate_recommendation_rollout_v2(
  p_hour TIMESTAMPTZ DEFAULT date_trunc('hour', now()) - INTERVAL '1 hour'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
<<evaluation>>
DECLARE
  evaluation_hour TIMESTAMPTZ := date_trunc('hour', p_hour);
  state_row public.recommendation_rollout_state_v2%ROWTYPE;
  previous_stage TEXT;
  next_stage TEXT;
  v2_requests BIGINT := 0;
  v2_clicks BIGINT := 0;
  v2_refinements BIGINT := 0;
  v2_feedback BIGINT := 0;
  v2_constraints BIGINT := 0;
  v2_errors BIGINT := 0;
  v2_correctness_evaluated BIGINT := 0;
  v2_correctness_failures BIGINT := 0;
  v2_p95 NUMERIC;
  baseline_requests BIGINT := 0;
  baseline_clicks BIGINT := 0;
  baseline_refinements BIGINT := 0;
  baseline_feedback BIGINT := 0;
  baseline_errors BIGINT := 0;
  baseline_p95 NUMERIC;
  latest_constraint_violations BIGINT := 0;
  click_probability NUMERIC;
  refinement_probability NUMERIC;
  ready BOOLEAN := false;
  failed BOOLEAN := false;
  failure_reasons TEXT[] := ARRAY[]::TEXT[];
  details JSONB;
BEGIN
  IF evaluation_hour >= date_trunc('hour', now()) THEN
    RAISE EXCEPTION 'only completed hours may be evaluated'
      USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext('evaluate_recommendation_rollout_v2'));
  SELECT * INTO state_row
  FROM public.recommendation_rollout_state_v2
  WHERE singleton
  FOR UPDATE;

  IF state_row.last_evaluated_hour IS NOT NULL
     AND evaluation_hour <= state_row.last_evaluated_hour THEN
    RETURN jsonb_build_object('action', 'already_evaluated', 'hour', evaluation_hour);
  END IF;

  PERFORM public.aggregate_recommendation_rollout_hour_v2(evaluation_hour);

  SELECT
    count(*),
    count(*) FILTER (WHERE useful_click),
    count(*) FILTER (WHERE immediate_refinement),
    count(*) FILTER (WHERE negative_feedback),
    count(*) FILTER (WHERE constraint_violation),
    count(*) FILTER (WHERE errored),
    count(*) FILTER (WHERE correctness_passed IS NOT NULL),
    count(*) FILTER (WHERE correctness_passed = false),
    percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)
  INTO
    v2_requests, v2_clicks, v2_refinements, v2_feedback, v2_constraints,
    v2_errors, v2_correctness_evaluated, v2_correctness_failures, v2_p95
  FROM public.recommendation_rollout_observations_v2
  WHERE stage = state_row.stage
    AND model_version = 'v2'
    AND observed_at >= state_row.stage_started_at
    AND observed_at < evaluation_hour + INTERVAL '1 hour';

  SELECT
    count(*),
    count(*) FILTER (WHERE useful_click),
    count(*) FILTER (WHERE immediate_refinement),
    count(*) FILTER (WHERE negative_feedback),
    count(*) FILTER (WHERE errored),
    percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)
  INTO
    baseline_requests, baseline_clicks, baseline_refinements,
    baseline_feedback, baseline_errors, baseline_p95
  FROM public.recommendation_rollout_observations_v2
  WHERE stage = state_row.stage
    AND model_version = 'baseline'
    AND observed_at >= state_row.stage_started_at
    AND observed_at < evaluation_hour + INTERVAL '1 hour';

  SELECT count(*)
  INTO latest_constraint_violations
  FROM public.recommendation_rollout_observations_v2
  WHERE model_version = 'v2'
    AND constraint_observed_at >= evaluation_hour
    AND constraint_observed_at < evaluation_hour + INTERVAL '1 hour';

  -- Full rollout uses the frozen baseline evidence captured on promotion from 50%.
  IF state_row.stage = '100' THEN
    baseline_requests := coalesce(state_row.baseline_requests, 0);
    baseline_clicks := coalesce(state_row.baseline_useful_clicks, 0);
    baseline_refinements := coalesce(state_row.baseline_immediate_refinements, 0);
    baseline_feedback := coalesce(state_row.baseline_negative_feedback, 0);
    baseline_errors := coalesce(state_row.baseline_errors, 0);
    baseline_p95 := state_row.baseline_p95_latency_ms;
  END IF;

  ready := v2_requests >= 500 AND baseline_requests >= 500;

  IF ready AND state_row.stage <> 'shadow' THEN
    click_probability := public.recommendation_rollout_noninferiority_probability_v2(
      v2_clicks, v2_requests, baseline_clicks, baseline_requests, 0.02, true
    );
    refinement_probability := public.recommendation_rollout_noninferiority_probability_v2(
      v2_refinements, v2_requests, baseline_refinements, baseline_requests, 0.02, false
    );
  END IF;

  details := jsonb_build_object(
    'v2_requests', v2_requests,
    'baseline_requests', baseline_requests,
    'v2_useful_click_rate', CASE WHEN v2_requests > 0 THEN v2_clicks::NUMERIC / v2_requests END,
    'baseline_useful_click_rate', CASE WHEN baseline_requests > 0 THEN baseline_clicks::NUMERIC / baseline_requests END,
    'useful_click_noninferiority_probability', click_probability,
    'v2_immediate_refinement_rate', CASE WHEN v2_requests > 0 THEN v2_refinements::NUMERIC / v2_requests END,
    'baseline_immediate_refinement_rate', CASE WHEN baseline_requests > 0 THEN baseline_refinements::NUMERIC / baseline_requests END,
    'immediate_refinement_noninferiority_probability', refinement_probability,
    'v2_negative_feedback_rate', CASE WHEN v2_requests > 0 THEN v2_feedback::NUMERIC / v2_requests END,
    'baseline_negative_feedback_rate', CASE WHEN baseline_requests > 0 THEN baseline_feedback::NUMERIC / baseline_requests END,
    'v2_error_rate', CASE WHEN v2_requests > 0 THEN v2_errors::NUMERIC / v2_requests END,
    'baseline_error_rate', CASE WHEN baseline_requests > 0 THEN baseline_errors::NUMERIC / baseline_requests END,
    'v2_p95_latency_ms', v2_p95,
    'baseline_p95_latency_ms', baseline_p95,
    'v2_correctness_evaluated', v2_correctness_evaluated,
    'v2_correctness_failures', v2_correctness_failures,
    'latest_constraint_violations', latest_constraint_violations
  );

  -- Constraints are irrelevant in shadow because V2 is not served there.
  IF state_row.stage <> 'shadow'
     AND (v2_constraints > 0 OR latest_constraint_violations > 0) THEN
    previous_stage := CASE state_row.stage
      WHEN '100' THEN '50'
      WHEN '50' THEN '25'
      WHEN '25' THEN '5'
      ELSE 'shadow'
    END;
    UPDATE public.recommendation_rollout_state_v2 SET
      stage = previous_stage,
      stage_started_at = now(),
      consecutive_guardrail_failures = 0,
      last_evaluated_hour = evaluation_hour,
      updated_at = now()
    WHERE singleton;
    INSERT INTO public.recommendation_rollout_audit_v2 (
      evaluation_hour, from_stage, to_stage, action, reason, details
    ) VALUES (
      evaluation_hour, state_row.stage, previous_stage, 'rolled_back',
      'Immediate rollback: V2 constraint violation', details
    );
    RETURN jsonb_build_object(
      'action', 'rolled_back', 'from_stage', state_row.stage,
      'to_stage', previous_stage, 'reason', 'constraint_violation'
    );
  END IF;

  IF ready THEN
    IF state_row.stage = 'shadow' THEN
      IF v2_constraints > 0 THEN
        failed := true;
        failure_reasons := array_append(failure_reasons, 'constraint_violation');
      ELSIF v2_correctness_evaluated < 500 THEN
        failed := true;
        failure_reasons := array_append(failure_reasons, 'shadow_correctness_coverage');
      ELSIF v2_correctness_failures > 0 THEN
        failed := true;
        failure_reasons := array_append(failure_reasons, 'shadow_correctness');
      END IF;
      IF v2_p95 IS NULL OR baseline_p95 IS NULL
         OR v2_p95 > baseline_p95 + greatest(150, baseline_p95 * 0.15) THEN
        failed := true;
        failure_reasons := array_append(failure_reasons, 'p95_latency');
      END IF;
    ELSE
      IF click_probability < 0.95 THEN
        failed := true;
        failure_reasons := array_append(failure_reasons, 'useful_click_noninferiority');
      END IF;
      IF refinement_probability < 0.95 THEN
        failed := true;
        failure_reasons := array_append(failure_reasons, 'immediate_refinement_noninferiority');
      END IF;
      IF v2_feedback::NUMERIC / v2_requests
         > baseline_feedback::NUMERIC / baseline_requests + 0.01 THEN
        failed := true;
        failure_reasons := array_append(failure_reasons, 'negative_feedback');
      END IF;
      IF v2_errors::NUMERIC / v2_requests
         > baseline_errors::NUMERIC / baseline_requests + 0.005 THEN
        failed := true;
        failure_reasons := array_append(failure_reasons, 'error_rate');
      END IF;
      IF v2_p95 IS NULL OR baseline_p95 IS NULL
         OR v2_p95 > baseline_p95 + greatest(150, baseline_p95 * 0.15) THEN
        failed := true;
        failure_reasons := array_append(failure_reasons, 'p95_latency');
      END IF;
    END IF;
  END IF;

  IF failed THEN
    IF state_row.consecutive_guardrail_failures >= 1
       AND state_row.last_evaluated_hour = evaluation_hour - INTERVAL '1 hour' THEN
      previous_stage := CASE state_row.stage
        WHEN '100' THEN '50'
        WHEN '50' THEN '25'
        WHEN '25' THEN '5'
        ELSE 'shadow'
      END;
      UPDATE public.recommendation_rollout_state_v2 SET
        stage = previous_stage,
        stage_started_at = now(),
        consecutive_guardrail_failures = 0,
        last_evaluated_hour = evaluation_hour,
        updated_at = now()
      WHERE singleton;
      INSERT INTO public.recommendation_rollout_audit_v2 (
        evaluation_hour, from_stage, to_stage, action, reason, details
      ) VALUES (
        evaluation_hour, state_row.stage, previous_stage, 'rolled_back',
        'Two consecutive hourly guardrail failures: ' || array_to_string(failure_reasons, ', '),
        details || jsonb_build_object('failure_reasons', failure_reasons)
      );
      RETURN jsonb_build_object(
        'action', 'rolled_back', 'from_stage', state_row.stage,
        'to_stage', previous_stage, 'failure_reasons', failure_reasons
      );
    END IF;

    UPDATE public.recommendation_rollout_state_v2 SET
      consecutive_guardrail_failures = 1,
      last_evaluated_hour = evaluation_hour,
      updated_at = now()
    WHERE singleton;
    INSERT INTO public.recommendation_rollout_audit_v2 (
      evaluation_hour, from_stage, to_stage, action, reason, details
    ) VALUES (
      evaluation_hour, state_row.stage, state_row.stage, 'guardrail_failure',
      'First hourly guardrail failure: ' || array_to_string(failure_reasons, ', '),
      details || jsonb_build_object('failure_reasons', failure_reasons)
    );
    RETURN jsonb_build_object(
      'action', 'guardrail_failure', 'stage', state_row.stage,
      'failure_reasons', failure_reasons
    );
  END IF;

  IF ready
     AND now() >= state_row.stage_started_at + INTERVAL '48 hours'
     AND state_row.stage <> '100' THEN
    next_stage := CASE state_row.stage
      WHEN 'shadow' THEN '5'
      WHEN '5' THEN '25'
      WHEN '25' THEN '50'
      WHEN '50' THEN '100'
    END;
    UPDATE public.recommendation_rollout_state_v2 SET
      stage = next_stage,
      stage_started_at = now(),
      consecutive_guardrail_failures = 0,
      last_evaluated_hour = evaluation_hour,
      baseline_requests = evaluation.baseline_requests,
      baseline_useful_clicks = evaluation.baseline_clicks,
      baseline_immediate_refinements = evaluation.baseline_refinements,
      baseline_negative_feedback = evaluation.baseline_feedback,
      baseline_errors = evaluation.baseline_errors,
      baseline_p95_latency_ms = evaluation.baseline_p95,
      updated_at = now()
    WHERE singleton;
    INSERT INTO public.recommendation_rollout_audit_v2 (
      evaluation_hour, from_stage, to_stage, action, reason, details
    ) VALUES (
      evaluation_hour, state_row.stage, next_stage, 'promoted',
      'Passed guardrails with at least 500 observations per arm and 48 hours at stage',
      details
    );
    RETURN jsonb_build_object(
      'action', 'promoted', 'from_stage', state_row.stage, 'to_stage', next_stage
    );
  END IF;

  UPDATE public.recommendation_rollout_state_v2 SET
    consecutive_guardrail_failures = 0,
    last_evaluated_hour = evaluation_hour,
    updated_at = now()
  WHERE singleton;
  INSERT INTO public.recommendation_rollout_audit_v2 (
    evaluation_hour, from_stage, to_stage, action, reason, details
  ) VALUES (
    evaluation_hour, state_row.stage, state_row.stage, 'held',
    CASE WHEN ready
      THEN 'Guardrails passed; minimum stage duration not yet reached or rollout is complete'
      ELSE 'Collecting minimum 500 observations per comparable arm'
    END,
    details
  );
  RETURN jsonb_build_object('action', 'held', 'stage', state_row.stage, 'ready', ready);
END;
$$;

REVOKE ALL ON TABLE public.recommendation_rollout_state_v2
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_rollout_audit_v2
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_rollout_observations_v2
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.recommendation_rollout_hourly_metrics_v2
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.recommendation_rollout_state_v2 TO authenticated;
GRANT SELECT ON TABLE public.recommendation_rollout_audit_v2 TO authenticated;
GRANT SELECT ON TABLE public.recommendation_rollout_hourly_metrics_v2 TO authenticated;
GRANT ALL ON TABLE public.recommendation_rollout_state_v2 TO service_role;
GRANT ALL ON TABLE public.recommendation_rollout_audit_v2 TO service_role;
GRANT ALL ON TABLE public.recommendation_rollout_observations_v2 TO service_role;
GRANT ALL ON TABLE public.recommendation_rollout_hourly_metrics_v2 TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.recommendation_rollout_audit_v2_id_seq TO service_role;

REVOKE ALL ON FUNCTION public.get_recommendation_rollout_assignment_v2(TEXT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_recommendation_rollout_observation_v2(
  TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.aggregate_recommendation_rollout_hour_v2(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recommendation_rollout_normal_cdf_v2(DOUBLE PRECISION)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recommendation_rollout_noninferiority_probability_v2(
  BIGINT, BIGINT, BIGINT, BIGINT, NUMERIC, BOOLEAN
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_recommendation_rollout_v2(TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_recommendation_rollout_assignment_v2(TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_recommendation_rollout_observation_v2(
  TEXT, TEXT, TEXT, INTEGER, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN, BOOLEAN
) TO service_role;
GRANT EXECUTE ON FUNCTION public.aggregate_recommendation_rollout_hour_v2(TIMESTAMPTZ)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.recommendation_rollout_normal_cdf_v2(DOUBLE PRECISION)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.recommendation_rollout_noninferiority_probability_v2(
  BIGINT, BIGINT, BIGINT, BIGINT, NUMERIC, BOOLEAN
) TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_recommendation_rollout_v2(TIMESTAMPTZ)
  TO service_role;

DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('evaluate-recommendation-rollout-v2-hourly');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  PERFORM cron.schedule(
    'evaluate-recommendation-rollout-v2-hourly',
    '5 * * * *',
    'SELECT public.evaluate_recommendation_rollout_v2();'
  );
END;
$$;
