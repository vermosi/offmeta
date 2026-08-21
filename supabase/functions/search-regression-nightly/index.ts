/**
 * Nightly Search Regression Replay
 *
 * Replays the saved low-confidence test corpus through the live
 * `semantic-search` pipeline every night and hands the failures to the
 * existing self-healing repair loop.
 *
 *  1. TOP-UP  — folds recurring low-confidence queries from telemetry into
 *               `search_regression_corpus` so the suite grows with real usage.
 *  2. REPLAY  — runs a bounded batch of corpus entries (oldest checked first),
 *               with cache disabled, and records confidence + Scryfall result
 *               count per query in `search_regression_results`.
 *  3. REPAIR  — when failures are found, invokes `self-heal-search`, which
 *               harvests the freshly logged low-confidence rows and installs
 *               deterministic rules for them.
 *
 * Bounded per run, single-flight via a job lease, idempotent (progress is
 * recorded per query as it completes), and circuit-broken on gateway
 * 402/403/429 responses.
 *
 * @module search-regression-nightly
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';
import { acquireJobLock, lockBusyResponse } from '../_shared/jobLock.ts';
import { checkScryfall, isRepairableQuery, sleep } from '../_shared/searchRepair.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = validateEnv([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
]);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const logger = createLogger('search-regression-nightly');

/** Queries replayed per run — bounds AI spend and keeps the run inside its budget. */
const MAX_QUERIES = 40;
/** Max new telemetry queries folded into the corpus per run. */
const MAX_TOPUP = 15;
/** Look-back window when topping the corpus up from telemetry. */
const TOPUP_LOOKBACK_DAYS = 7;
/** Spacing between replays so the pipeline and Scryfall are never hammered. */
const REPLAY_SPACING_MS = 400;
/** Whole-run wall clock budget. */
const RUN_BUDGET_MS = 220_000;
/** Failures required before the repair loop is invoked. */
const MIN_FAILURES_FOR_REPAIR = 1;
/** Consecutive failures before an entry is parked as unrepairable. */
const MAX_CONSECUTIVE_FAILURES = 8;

interface CorpusRow {
  id: string;
  query: string;
  locale: string;
  expected_min_results: number;
  min_confidence: number;
  consecutive_failures: number;
}

interface ReplayOutcome {
  query: string;
  locale: string;
  scryfall_query: string | null;
  confidence: number | null;
  result_count: number | null;
  passed: boolean;
  failure_reason: string | null;
  duration_ms: number;
}

/** Terminal gateway states that must stop the whole run, not just one query. */
class CircuitOpen extends Error {
  constructor(public readonly status: number) {
    super(`gateway_${status}`);
  }
}

/** 1. Fold recurring low-confidence telemetry queries into the corpus. */
async function topUpCorpus(): Promise<number> {
  const since = new Date(Date.now() - TOPUP_LOOKBACK_DAYS * 86_400_000).toISOString();

  const { data, error } = await supabase.rpc('get_low_confidence_candidates' as never, {
    since_date: since,
    min_frequency: 2,
    max_results: MAX_TOPUP,
    max_confidence: 0.75,
  });

  if (error) {
    logger.warn('topup_failed', { error: error.message });
    return 0;
  }

  const rows = ((data as Array<{ query: string }> | null) ?? [])
    .map((r) => r.query?.trim())
    .filter((q): q is string => Boolean(q) && q.length >= 3 && q.length <= 120)
    .filter((q) => isRepairableQuery(q))
    .map((query) => ({ query, locale: 'en', source: 'telemetry_low_confidence' }));

  if (rows.length === 0) return 0;

  const { error: insertError } = await supabase
    .from('search_regression_corpus')
    .upsert(rows, { onConflict: 'query,locale', ignoreDuplicates: true });

  if (insertError) {
    // The unique index is expression-based, so upsert conflict targets can be
    // rejected; fall back to per-row inserts that tolerate duplicates.
    for (const row of rows) {
      await supabase.from('search_regression_corpus').insert(row);
    }
  }

  return rows.length;
}

/** 2. Pick the batch: oldest-checked active entries first. */
async function loadBatch(): Promise<CorpusRow[]> {
  const { data, error } = await supabase
    .from('search_regression_corpus')
    .select('id, query, locale, expected_min_results, min_confidence, consecutive_failures')
    .eq('active', true)
    .is('archived_at', null)
    .order('last_checked_at', { ascending: true, nullsFirst: true })
    .limit(MAX_QUERIES);

  if (error) {
    logger.error('batch_load_failed', { error: error.message });
    return [];
  }
  return (data as CorpusRow[]) ?? [];
}

/** Replay one query through the live pipeline with caching disabled. */
async function replay(row: CorpusRow): Promise<ReplayOutcome> {
  const startedAt = Date.now();
  const base: ReplayOutcome = {
    query: row.query,
    locale: row.locale,
    scryfall_query: null,
    confidence: null,
    result_count: null,
    passed: false,
    failure_reason: null,
    duration_ms: 0,
  };

  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/semantic-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query: row.query,
        locale: row.locale,
        useCache: false,
        appVersion: 'regression-nightly',
      }),
    });
  } catch (error) {
    return {
      ...base,
      failure_reason: `pipeline_unreachable: ${
        error instanceof Error ? error.message : String(error)
      }`,
      duration_ms: Date.now() - startedAt,
    };
  }

  if (response.status === 402 || response.status === 403 || response.status === 429) {
    throw new CircuitOpen(response.status);
  }

  const body = (await response.json().catch(() => null)) as
    | { scryfallQuery?: string; explanation?: { confidence?: number } }
    | null;

  if (!response.ok || !body?.scryfallQuery) {
    return {
      ...base,
      failure_reason: `pipeline_error_${response.status}`,
      duration_ms: Date.now() - startedAt,
    };
  }

  const confidence = typeof body.explanation?.confidence === 'number'
    ? body.explanation.confidence
    : null;

  const check = await checkScryfall(body.scryfallQuery);
  const resultCount = check.totalCards ?? 0;

  let failureReason: string | null = null;
  if (resultCount < row.expected_min_results) {
    failureReason = check.error ? `no_results: ${check.error}` : 'no_results';
  } else if (confidence !== null && confidence < Number(row.min_confidence)) {
    failureReason = 'low_confidence';
  }

  return {
    ...base,
    scryfall_query: body.scryfallQuery,
    confidence,
    result_count: resultCount,
    passed: failureReason === null,
    failure_reason: failureReason,
    duration_ms: Date.now() - startedAt,
  };
}

/** Record one query's outcome immediately so a crashed run never redoes it. */
async function recordOutcome(
  runId: string,
  row: CorpusRow,
  outcome: ReplayOutcome,
): Promise<void> {
  await supabase.from('search_regression_results').insert({
    run_id: runId,
    query: outcome.query,
    locale: outcome.locale,
    scryfall_query: outcome.scryfall_query,
    confidence: outcome.confidence,
    result_count: outcome.result_count,
    passed: outcome.passed,
    failure_reason: outcome.failure_reason,
    duration_ms: outcome.duration_ms,
  });

  const consecutive = outcome.passed ? 0 : row.consecutive_failures + 1;
  await supabase
    .from('search_regression_corpus')
    .update({
      last_checked_at: new Date().toISOString(),
      last_confidence: outcome.confidence,
      last_result_count: outcome.result_count,
      consecutive_failures: consecutive,
      // Park chronically unfixable entries so the suite keeps converging.
      active: consecutive < MAX_CONSECUTIVE_FAILURES,
    })
    .eq('id', row.id);
}

/** 3. Hand the failures to the existing self-healing repair loop. */
async function invokeSelfHeal(): Promise<{ ok: boolean; repaired: number; detail: string }> {
  const pipelineKey = Deno.env.get('OFFMETA_PIPELINE_KEY');
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/self-heal-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify(pipelineKey ? { pipeline_key: pipelineKey } : {}),
    });
    const body = (await res.json().catch(() => null)) as
      | { repaired?: number; installed?: number }
      | null;
    return {
      ok: res.ok,
      repaired: body?.repaired ?? body?.installed ?? 0,
      detail: `HTTP ${res.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      repaired: 0,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

serve(
  withLogging('search-regression-nightly', async (req) => {
    const corsHeaders = getCorsHeaders(req);
    const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const auth = await requireServiceOrPipelineKey(req, corsHeaders);
    if (!auth.authorized) return auth.response;

    const lease = await acquireJobLock('search-regression-nightly', 900);
    if (!lease.acquired) return lockBusyResponse('search-regression-nightly', jsonHeaders);

    const startedAt = Date.now();
    const { data: runRow } = await supabase
      .from('search_regression_runs')
      .insert({ status: 'running', trigger_source: 'cron' })
      .select('id')
      .single();
    const runId = (runRow as { id: string } | null)?.id;

    let passed = 0;
    let failed = 0;
    let lowConfidence = 0;
    let confidenceSum = 0;
    let confidenceCount = 0;
    let circuitStatus: number | null = null;
    const failures: Array<{ query: string; reason: string }> = [];

    try {
      const toppedUp = await topUpCorpus();
      const batch = await loadBatch();

      for (const row of batch) {
        if (Date.now() - startedAt > RUN_BUDGET_MS) break;

        let outcome: ReplayOutcome;
        try {
          outcome = await replay(row);
        } catch (error) {
          if (error instanceof CircuitOpen) {
            circuitStatus = error.status;
            logger.error('circuit_open', { status: error.status });
            break;
          }
          throw error;
        }

        if (runId) await recordOutcome(runId, row, outcome);

        if (outcome.confidence !== null) {
          confidenceSum += outcome.confidence;
          confidenceCount += 1;
        }
        if (outcome.passed) {
          passed += 1;
        } else {
          failed += 1;
          if (outcome.failure_reason === 'low_confidence') lowConfidence += 1;
          failures.push({ query: outcome.query, reason: outcome.failure_reason ?? 'unknown' });
        }

        await sleep(REPLAY_SPACING_MS);
      }

      // Repairs run through the existing self-heal loop, which harvests the
      // low-confidence rows this replay just wrote to translation_logs.
      let repair = { ok: false, repaired: 0, detail: 'not_invoked' };
      if (circuitStatus === null && failed >= MIN_FAILURES_FOR_REPAIR) {
        repair = await invokeSelfHeal();
      }

      const summary = {
        status: circuitStatus ? 'paused' : 'completed',
        total: passed + failed,
        passed,
        failed,
        low_confidence: lowConfidence,
        repair_invoked: repair.detail !== 'not_invoked',
        repaired: repair.repaired,
        avg_confidence: confidenceCount ? confidenceSum / confidenceCount : null,
        details: {
          toppedUp,
          circuitStatus,
          repairDetail: repair.detail,
          failures: failures.slice(0, 25),
          durationMs: Date.now() - startedAt,
        },
        finished_at: new Date().toISOString(),
      };

      if (runId) {
        await supabase.from('search_regression_runs').update(summary).eq('id', runId);
      }

      logger.info('run_complete', {
        passed,
        failed,
        lowConfidence,
        repaired: repair.repaired,
      });

      return new Response(JSON.stringify({ success: true, runId, ...summary }), {
        headers: jsonHeaders,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('run_failed', { error: message });
      if (runId) {
        await supabase
          .from('search_regression_runs')
          .update({
            status: 'failed',
            passed,
            failed,
            low_confidence: lowConfidence,
            total: passed + failed,
            details: { error: message },
            finished_at: new Date().toISOString(),
          })
          .eq('id', runId);
      }
      return new Response(JSON.stringify({ success: false, error: message }), {
        status: 500,
        headers: jsonHeaders,
      });
    } finally {
      await lease.release();
    }
  }),
);
