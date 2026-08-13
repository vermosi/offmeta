/**
 * ops-watchdog — unattended operations autopilot.
 *
 * Replaces the "someone checks the admin panel" step. Runs hourly on pg_cron
 * and does four things, all idempotent and bounded:
 *
 *   1. CRON FAILURES  — reads failed pg_cron runs from the last 24h and files
 *                       an error_event per failing job so error-auto-fix retries
 *                       the underlying edge function.
 *   2. FRESHNESS      — if a pipeline's output is stale (prices, self-heal,
 *                       sitemap), re-invokes the responsible function directly.
 *   3. STUCK WORK     — un-sticks self_heal_runs left in `running`, and gives
 *                       exhausted error_events one bounded retry window before
 *                       closing them out so the queue never needs a human.
 *   4. DRAIN          — kicks error-auto-fix whenever open errors remain.
 *
 * Every run is written to public.ops_watchdog_runs for auditability.
 *
 * @module ops-watchdog
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';
import { reportEdgeError } from '../_shared/errorReporter.ts';
import { acquireJobLock, lockBusyResponse } from '../_shared/jobLock.ts';

const JOB_NAME = 'ops-watchdog';
/** Lease held for a whole watchdog run; above its worst-case wall clock. */
const LOCK_TTL_SECONDS = 300;
/** Minimum gap between two dispatches of the same repair pipeline. */
const DISPATCH_COOLDOWN_SECONDS = 3 * 60 * 60;

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const logger = createLogger('ops-watchdog');

/** Functions the watchdog may re-invoke. Everything else is report-only. */
const INVOKABLE = new Set([
  'price-snapshot',
  'self-heal-search',
  'submit-sitemap',
  'error-auto-fix',
  'bulk-data-sync',
  'sync-card-names',
  'seo-health-check',
]);

/** Staleness budgets, in hours, before the owning job is re-invoked. */
const FRESHNESS_BUDGET_HOURS = {
  price_snapshot: 36,
  self_heal: 18,
  sitemap: 192,
} as const;

/** A self_heal_runs row stuck in `running` longer than this is marked failed. */
const STUCK_RUN_HOURS = 2;
/** Attempts after which an error_event is closed out instead of retried. */
const MAX_TOTAL_FIX_ATTEMPTS = 6;
/** Cooldown before an exhausted error_event gets another repair window. */
const RETRY_COOLDOWN_HOURS = 24;
/** How long to wait on a dispatched repair job before moving on. */
const DISPATCH_TIMEOUT_MS = 5_000;

type Check = {
  check: string;
  status: 'ok' | 'problem' | 'remediated' | 'error';
  detail?: string;
  data?: Record<string, unknown>;
};

interface CronFailureRow {
  jobname: string;
  jobid: number;
  failures: number;
  last_run: string;
  last_message: string | null;
}

const hoursSince = (iso: string | null | undefined): number =>
  iso ? (Date.now() - new Date(iso).getTime()) / 3_600_000 : Number.POSITIVE_INFINITY;

/** Map a pg_cron job name onto the edge function it drives, when there is one. */
function functionForJob(jobname: string): string | null {
  for (const name of INVOKABLE) {
    if (jobname.startsWith(name)) return name;
  }
  return null;
}

/**
 * Dispatch a repair job. The watchdog never waits for the target to finish —
 * some pipelines run for minutes and would blow the watchdog's own wall clock.
 * A dispatch that is still running when the timeout fires counts as success.
 *
 * Dispatches are deduped twice over: once in-process (two checks in the same
 * run can want the same pipeline) and once across runs via a job lease, so an
 * hourly watchdog can't re-kick a pipeline that is still working.
 */
const dispatchedThisRun = new Map<string, { ok: boolean; detail: string }>();

async function invokeFunction(name: string): Promise<{ ok: boolean; detail: string }> {
  if (!INVOKABLE.has(name)) return { ok: false, detail: 'function_not_allowed' };

  const already = dispatchedThisRun.get(name);
  if (already) return { ...already, detail: `deduped_in_run: ${already.detail}` };

  const lease = await acquireJobLock(`dispatch:${name}`, DISPATCH_COOLDOWN_SECONDS);
  if (!lease.acquired) {
    const skipped = { ok: true, detail: 'skipped: dispatched recently' };
    dispatchedThisRun.set(name, skipped);
    return skipped;
  }

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ triggered_by: 'ops-watchdog' }),
      signal: AbortSignal.timeout(DISPATCH_TIMEOUT_MS),
    });
    const detail = `${res.status}`;
    if (!res.ok) {
      const body = await res.text();
      logger.warn(`invoke ${name} failed [${res.status}]: ${body.slice(0, 400)}`);
      const failed = { ok: false, detail: `${detail}: ${body.slice(0, 200)}` };
      dispatchedThisRun.set(name, failed);
      return failed;
    }
    // Drain the body so the connection closes cleanly.
    await res.text();
    const done = { ok: true, detail };
    dispatchedThisRun.set(name, done);
    return done;
  } catch (err) {
    const message = String(err);
    const outcome = message.includes('Timeout') || message.includes('aborted')
      ? { ok: true, detail: 'dispatched (still running)' }
      : { ok: false, detail: message.slice(0, 200) };
    dispatchedThisRun.set(name, outcome);
    return outcome;
  }
  // The dispatch lease is intentionally left to expire: it is the cooldown
  // that stops the next hourly run from re-kicking a pipeline still in flight.
}


/** 1. File error_events for pg_cron jobs that failed recently. */
async function checkCronFailures(checks: Check[]): Promise<void> {
  const { data, error } = await supabase.rpc('get_recent_cron_failures', { p_hours: 24 });
  if (error) {
    checks.push({ check: 'cron_failures', status: 'error', detail: error.message });
    return;
  }
  const rows = (data ?? []) as CronFailureRow[];
  if (rows.length === 0) {
    checks.push({ check: 'cron_failures', status: 'ok' });
    return;
  }
  for (const row of rows) {
    const fn = functionForJob(row.jobname);
    await reportEdgeError({
      source: 'ops-watchdog',
      errorType: fn ? 'edge_function_failure' : 'cron_job_failure',
      message: `pg_cron job ${row.jobname} failed ${row.failures}x: ${
        row.last_message ?? 'no message'
      }`,
      severity: 'error',
      context: { job: row.jobname, failures: row.failures, function: fn },
    });
  }
  checks.push({
    check: 'cron_failures',
    status: 'problem',
    detail: `${rows.length} failing job(s) reported for auto-repair`,
    data: { jobs: rows.map((r) => r.jobname) },
  });
}

/** 2. Re-invoke pipelines whose output has gone stale. */
async function checkFreshness(checks: Check[]): Promise<number> {
  const { data, error } = await supabase.rpc('get_ops_freshness');
  if (error) {
    checks.push({ check: 'freshness', status: 'error', detail: error.message });
    return 0;
  }
  const f = (data ?? {}) as Record<string, string | number | null>;
  const targets: Array<{ key: string; age: number; budget: number; fn: string }> = [
    {
      key: 'price_snapshot',
      age: hoursSince(f.price_snapshot_last_at as string),
      budget: FRESHNESS_BUDGET_HOURS.price_snapshot,
      fn: 'price-snapshot',
    },
    {
      key: 'self_heal',
      age: hoursSince(f.self_heal_last_success_at as string),
      budget: FRESHNESS_BUDGET_HOURS.self_heal,
      fn: 'self-heal-search',
    },
    {
      key: 'sitemap',
      age: hoursSince(f.sitemap_last_submitted_at as string),
      budget: FRESHNESS_BUDGET_HOURS.sitemap,
      fn: 'submit-sitemap',
    },
  ];

  let remediations = 0;
  for (const t of targets) {
    if (t.age <= t.budget) {
      checks.push({ check: `freshness:${t.key}`, status: 'ok', data: { ageHours: Math.round(t.age) } });
      continue;
    }
    const result = await invokeFunction(t.fn);
    if (result.ok) remediations += 1;
    checks.push({
      check: `freshness:${t.key}`,
      status: result.ok ? 'remediated' : 'error',
      detail: `stale, re-invoked ${t.fn}: ${result.detail}`,
      data: { ageHours: Number.isFinite(t.age) ? Math.round(t.age) : null },
    });
  }
  return remediations;
}

/** 3a. Mark abandoned self-heal runs as failed so the next run starts clean. */
async function unstickSelfHealRuns(checks: Check[]): Promise<number> {
  const cutoff = new Date(Date.now() - STUCK_RUN_HOURS * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from('self_heal_runs')
    .update({ status: 'failed', finished_at: new Date().toISOString() })
    .eq('status', 'running')
    .lt('started_at', cutoff)
    .select('id');
  if (error) {
    checks.push({ check: 'stuck_self_heal_runs', status: 'error', detail: error.message });
    return 0;
  }
  const count = data?.length ?? 0;
  checks.push({
    check: 'stuck_self_heal_runs',
    status: count > 0 ? 'remediated' : 'ok',
    data: { unstuck: count },
  });
  return count;
}

/** 3b. Give exhausted error_events one more window, then close them out. */
async function rotateExhaustedErrors(checks: Check[]): Promise<number> {
  const cooldown = new Date(Date.now() - RETRY_COOLDOWN_HOURS * 3_600_000).toISOString();
  const { data, error } = await supabase
    .from('error_events')
    .select('id, fix_attempts, last_fix_at, error_type')
    .eq('status', 'open')
    .gte('fix_attempts', 3)
    .limit(50);
  if (error) {
    checks.push({ check: 'exhausted_errors', status: 'error', detail: error.message });
    return 0;
  }

  const rows = (data ?? []) as Array<{
    id: string;
    fix_attempts: number;
    last_fix_at: string | null;
    error_type: string;
  }>;
  const retryIds: string[] = [];
  const closeIds: string[] = [];
  for (const row of rows) {
    if (row.last_fix_at && row.last_fix_at > cooldown) continue;
    if (row.fix_attempts >= MAX_TOTAL_FIX_ATTEMPTS) closeIds.push(row.id);
    else retryIds.push(row.id);
  }

  let remediations = 0;
  if (retryIds.length > 0) {
    const { error: retryError } = await supabase
      .from('error_events')
      .update({ fix_attempts: 0 })
      .in('id', retryIds);
    if (!retryError) remediations += retryIds.length;
  }
  if (closeIds.length > 0) {
    const { error: closeError } = await supabase
      .from('error_events')
      .update({ status: 'unfixable' })
      .in('id', closeIds);
    if (!closeError) remediations += closeIds.length;
  }

  checks.push({
    check: 'exhausted_errors',
    status: remediations > 0 ? 'remediated' : 'ok',
    data: { retried: retryIds.length, closed: closeIds.length },
  });
  return remediations;
}

/** 4. Drain the open error queue by kicking the repair job. */
async function drainErrorQueue(checks: Check[]): Promise<number> {
  const { count, error } = await supabase
    .from('error_events')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'open');
  if (error) {
    checks.push({ check: 'error_queue', status: 'error', detail: error.message });
    return 0;
  }
  if (!count) {
    checks.push({ check: 'error_queue', status: 'ok', data: { open: 0 } });
    return 0;
  }
  const result = await invokeFunction('error-auto-fix');
  checks.push({
    check: 'error_queue',
    status: result.ok ? 'remediated' : 'error',
    detail: result.detail,
    data: { open: count },
  });
  return result.ok ? 1 : 0;
}

serve(
  withLogging('ops-watchdog', async (req: Request) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

    const auth = await requireServiceOrPipelineKey(req, corsHeaders);
    if (!auth.authorized) return auth.response;

    const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

    // One watchdog at a time: cron and a manual trigger can overlap.
    const lease = await acquireJobLock(JOB_NAME, LOCK_TTL_SECONDS);
    if (!lease.acquired) return lockBusyResponse(JOB_NAME, jsonHeaders);

    dispatchedThisRun.clear();

    // Close out any earlier run that never reported back (cold shutdown).
    await supabase
      .from('ops_watchdog_runs')
      .update({ status: 'abandoned', finished_at: new Date().toISOString() })
      .eq('status', 'running')
      .lt('started_at', new Date(Date.now() - 3_600_000).toISOString());

    const startedAt = new Date().toISOString();
    const { data: runRow } = await supabase
      .from('ops_watchdog_runs')
      .insert({ started_at: startedAt })
      .select('id')
      .maybeSingle();
    const runId = runRow?.id as string | undefined;

    const checks: Check[] = [];
    let remediations = 0;

    try {
      await checkCronFailures(checks);
      remediations += await checkFreshness(checks);
      remediations += await unstickSelfHealRuns(checks);
      remediations += await rotateExhaustedErrors(checks);
      remediations += await drainErrorQueue(checks);
    } catch (err) {
      logger.error(`watchdog run failed: ${String(err)}`);
      checks.push({ check: 'run', status: 'error', detail: String(err).slice(0, 500) });
    }

    const problems = checks.filter((c) => c.status !== 'ok').length;
    const status = checks.some((c) => c.status === 'error') ? 'degraded' : 'completed';

    if (runId) {
      await supabase
        .from('ops_watchdog_runs')
        .update({
          finished_at: new Date().toISOString(),
          status,
          problems,
          remediations,
          checks,
        })
        .eq('id', runId);
    }

    await lease.release();

    return new Response(
      JSON.stringify({ success: true, status, problems, remediations, checks }),
      { headers: jsonHeaders },
    );
  }),
);
