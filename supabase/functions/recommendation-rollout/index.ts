import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { withLogging } from '../_shared/logger.ts';
import { checkRateLimit, resolveRateLimitKey } from '../_shared/rateLimit.ts';

type ObservationBody = {
  requestId: string;
  subjectKey: string;
  modelVersion: 'baseline' | 'v2';
  latencyMs: number;
  usefulClick?: boolean;
  immediateRefinement?: boolean;
  negativeFeedback?: boolean;
  constraintViolation?: boolean;
  errored?: boolean;
  correctnessPassed?: boolean | null;
};

// Client-side guards sit slightly above the RPC statement_timeout values
// (3s / 5s) so the database cancels first when it is the slow party.
const ASSIGNMENT_TIMEOUT_MS = 4000;
const OBSERVATION_TIMEOUT_MS = 6000;

/** Statement timeout, query cancellation, or an aborted client request. */
const isTimeoutError = (error: {
  code?: string | null;
  message?: string | null;
  name?: string | null;
}): boolean => {
  if (error.code === '57014' || error.code === '57P01') return true;
  const message = (error.message ?? '').toLowerCase();
  return (
    error.name === 'AbortError' ||
    message.includes('statement timeout') ||
    message.includes('canceling statement') ||
    message.includes('aborted') ||
    message.includes('timeout')
  );
};

const validText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;


serve(
  withLogging('recommendation-rollout', async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);
    const headers = { ...corsHeaders, 'Content-Type': 'application/json' };
    if (req.method === 'OPTIONS')
      return new Response(null, { headers: corsHeaders });
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers,
      });
    }

    const auth = await validateAuth(req);
    if (!auth.authorized) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers,
      });
    }

    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    if (!body || !validText(body.subjectKey, 512)) {
      return new Response(JSON.stringify({ error: 'Invalid subject key' }), {
        status: 400,
        headers,
      });
    }

    const rateLimit = await checkRateLimit(
      `recommendation-rollout:${await resolveRateLimitKey(req)}`,
      undefined,
      60,
      2000,
    );
    if (!rateLimit.allowed) {
      return new Response(JSON.stringify({ error: 'Rate limited' }), {
        status: rateLimit.statusCode ?? 429,
        headers: {
          ...headers,
          'Retry-After': String(rateLimit.retryAfter ?? 60),
        },
      });
    }

    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) {
      return new Response(JSON.stringify({ error: 'Not configured' }), {
        status: 500,
        headers,
      });
    }
    const admin = createClient(url, key);

    if (body.action === 'assignment') {
      const { data, error } = await admin
        .rpc('get_recommendation_rollout_assignment_v2', {
          p_subject_key: body.subjectKey,
        })
        .abortSignal(AbortSignal.timeout(ASSIGNMENT_TIMEOUT_MS));
      if (error) {
        // A slow/aborted query must not surface as an outage: degrade to the
        // baseline assignment so callers keep serving results.
        if (isTimeoutError(error)) {
          return new Response(
            JSON.stringify({ success: true, assignment: null, degraded: true }),
            { headers },
          );
        }
        return new Response(
          JSON.stringify({ error: 'Assignment unavailable' }),
          { status: 503, headers },
        );
      }
      return new Response(
        JSON.stringify({ success: true, assignment: data?.[0] ?? null }),
        { headers },
      );
    }


    const observation = body as unknown as ObservationBody & {
      action?: string;
    };
    if (
      body.action !== 'observe' ||
      !validText(observation.requestId, 256) ||
      !['baseline', 'v2'].includes(observation.modelVersion) ||
      !Number.isInteger(observation.latencyMs) ||
      observation.latencyMs < 0 ||
      observation.latencyMs > 600000
    ) {
      return new Response(JSON.stringify({ error: 'Invalid observation' }), {
        status: 400,
        headers,
      });
    }
    const { error } = await admin
      .rpc('record_recommendation_rollout_observation_v2', {
        p_request_id: observation.requestId,
        p_subject_key: observation.subjectKey,
        p_model_version: observation.modelVersion,
        p_latency_ms: observation.latencyMs,
        p_useful_click: observation.usefulClick ?? false,
        p_immediate_refinement: observation.immediateRefinement ?? false,
        p_negative_feedback: observation.negativeFeedback ?? false,
        p_constraint_violation: observation.constraintViolation ?? false,
        p_errored: observation.errored ?? false,
        p_correctness_passed: observation.correctnessPassed ?? null,
      })
      .abortSignal(AbortSignal.timeout(OBSERVATION_TIMEOUT_MS));
    if (error) {
      // Telemetry is best-effort; a timed-out write is dropped, not an error.
      if (isTimeoutError(error)) {
        return new Response(JSON.stringify({ success: false, degraded: true }), {
          status: 202,
          headers,
        });
      }
      return new Response(JSON.stringify({ error: 'Observation rejected' }), {
        status: 400,
        headers,
      });
    }
    return new Response(JSON.stringify({ success: true }), { headers });

  }),
);
