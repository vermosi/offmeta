/**
 * Self-Heal Search Edge Function
 *
 * Closed-loop repair for search quality. Runs unattended every few hours and
 * performs three phases:
 *
 *  1. VERIFY   — re-checks every auto-generated rule still on probation against
 *                Scryfall and against live zero-result telemetry. Rules that
 *                stopped working are rolled back (archived), rules that held up
 *                graduate to `verified`.
 *  2. HARVEST  — pulls failing searches from BOTH translation logs and client
 *                analytics events (the client path never reaches the server log).
 *  3. REPAIR   — asks the model for a working translation, validates it against
 *                Scryfall, retries with the rejection reason folded back into the
 *                prompt, then installs it as an active rule on probation.
 *
 * Every run is recorded in `self_heal_runs` so the loop is auditable without
 * digging through function logs.
 *
 * @module self-heal-search
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, requireServiceOrPipelineKey } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger, withLogging } from '../_shared/logger.ts';
import { acquireJobLock, lockBusyResponse } from '../_shared/jobLock.ts';
import {
  buildRepairPrompt,
  checkScryfall,
  isRepairableQuery,
  parseRepairResponse,
  SCRYFALL_DELAY_MS,
  sleep,
  type RepairSuggestion,
} from '../_shared/searchRepair.ts';
import { validateOtags } from '../_shared/otagValidation.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY } =
  validateEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'LOVABLE_API_KEY']);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const logger = createLogger('self-heal-search');

/** Look-back window for harvesting failing searches. */
const LOOKBACK_DAYS = 30;
/** Max failing searches repaired per run (bounds AI + Scryfall spend). */
const MAX_CANDIDATES = 12;
/** Model attempts per candidate before giving up. */
const MAX_ATTEMPTS = 4;
/**
 * Temperature ladder: attempt 0 stays deterministic, later attempts diversify so
 * retries explore new syntax instead of repeating the same failed query.
 */
const ATTEMPT_TEMPERATURES = [0.2, 0.6, 0.9, 1.0];
/** A repair must return at least this many cards to be installed. */
const MIN_RESULTS = 3;
/** Exact-name (single-card) lookups should not be penalized for returning one match. */
const MIN_RESULTS_EXACT_NAME = 1;
/** Model confidence floor for installing a repair. */
const MIN_CONFIDENCE = 0.6;
/** How long a new rule stays on probation before it can graduate. */
const PROBATION_HOURS = 24;
/** Consecutive verification failures before a rule is rolled back. */
const MAX_RULE_FAILURES = 2;

interface RuleRow {
  id: string;
  pattern: string;
  scryfall_syntax: string;
  created_at: string;
  failure_count: number;
}

interface Candidate {
  query: string;
  frequency: number;
  last_translation: string;
  sources: string;
}

type Detail = Record<string, unknown>;

/** Exact-name Scryfall syntax matches a single card by name (e.g. !"..." or name:"..."). */
function isExactNameSyntax(syntax: string): boolean {
  const trimmed = syntax.trim().toLowerCase();
  return (
    trimmed.startsWith('!') ||
    trimmed.startsWith('name:"') ||
    /^"[^"]+"$/.test(trimmed)
  );
}

function minResultsFor(syntax: string): number {
  return isExactNameSyntax(syntax) ? MIN_RESULTS_EXACT_NAME : MIN_RESULTS;
}

/** Phase 1 — re-validate probationary rules and roll back the broken ones. */
async function verifyProbationRules(details: Detail[]): Promise<{
  verified: number;
  rolledBack: number;
}> {
  const { data, error } = await supabase
    .from('translation_rules')
    .select('id, pattern, scryfall_syntax, created_at, failure_count')
    .eq('auto_generated', true)
    .eq('verification_state', 'probation')
    .is('archived_at', null)
    .order('created_at', { ascending: true })
    .limit(25);

  if (error || !data?.length) return { verified: 0, rolledBack: 0 };

  let verified = 0;
  let rolledBack = 0;

  for (const rule of data as RuleRow[]) {
    await sleep(SCRYFALL_DELAY_MS);
    const check = await checkScryfall(rule.scryfall_syntax);

    // Did users still hit zero results for this pattern after the rule landed?
    const { count: stillFailing } = await supabase
      .from('analytics_events')
      .select('id', { count: 'exact', head: true })
      .in('event_type', ['search_failure', 'search_no_result_shown'])
      .gte('created_at', rule.created_at)
      .filter('event_data->>query', 'ilike', rule.pattern);

    const threshold = minResultsFor(rule.scryfall_syntax);
    const healthy = check.ok && check.totalCards >= threshold && !stillFailing;

    if (healthy) {
      const ageHours =
        (Date.now() - new Date(rule.created_at).getTime()) / 3_600_000;
      const graduated = ageHours >= PROBATION_HOURS;
      await supabase
        .from('translation_rules')
        .update({
          verification_state: graduated ? 'verified' : 'probation',
          last_verified_at: new Date().toISOString(),
          verified_result_count: check.totalCards,
          failure_count: 0,
        })
        .eq('id', rule.id);
      if (graduated) verified++;
      continue;
    }

    const failures = (rule.failure_count ?? 0) + 1;
    const rollback = failures >= MAX_RULE_FAILURES;
    await supabase
      .from('translation_rules')
      .update({
        failure_count: failures,
        last_verified_at: new Date().toISOString(),
        verified_result_count: check.totalCards,
        ...(rollback
          ? {
              is_active: false,
              archived_at: new Date().toISOString(),
              verification_state: 'rejected',
            }
          : {}),
      })
      .eq('id', rule.id);

    if (rollback) {
      rolledBack++;
      details.push({
        phase: 'rollback',
        pattern: rule.pattern,
        syntax: rule.scryfall_syntax,
        reason: check.ok ? 'still reported zero results by users' : 'scryfall returned nothing',
      });
      logger.warn('rule_rolled_back', { pattern: rule.pattern });
    }
  }

  return { verified, rolledBack };
}

/** Phase 2 — harvest failing searches from every telemetry source. */
async function harvestCandidates(): Promise<Candidate[]> {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const { data, error } = await supabase.rpc(
    'get_search_failure_candidates' as never,
    {
      since_date: since.toISOString(),
      min_frequency: 1,
      max_results: MAX_CANDIDATES * 3,
    },
  );

  if (error) {
    logger.error('harvest_failed', { error: error.message });
    return [];
  }

  return ((data as Candidate[]) ?? []).filter((c) => isRepairableQuery(c.query));
}

async function ruleExists(pattern: string): Promise<boolean> {
  const { data } = await supabase
    .from('translation_rules')
    .select('id')
    .ilike('pattern', pattern)
    .is('archived_at', null)
    .limit(1);
  return (data?.length ?? 0) > 0;
}

/** Was this pattern already tried and rejected? Don't burn budget twice. */
async function previouslyRejected(pattern: string): Promise<boolean> {
  const { data } = await supabase
    .from('translation_rules')
    .select('id')
    .ilike('pattern', pattern)
    .eq('verification_state', 'rejected')
    .limit(1);
  return (data?.length ?? 0) > 0;
}

async function askModel(prompt: string): Promise<string | null> {
  try {
    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash-lite',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
        }),
      },
    );
    if (!response.ok) {
      logger.error('ai_error', { status: response.status });
      return null;
    }
    const body = await response.json();
    return body.choices?.[0]?.message?.content ?? null;
  } catch (error) {
    logger.error('ai_exception', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Phase 3 — repair one candidate. The rejection reason from a failed attempt is
 * fed back into the next prompt, which is what makes the loop converge without
 * a human in the middle.
 */
async function repairCandidate(
  candidate: Candidate,
  details: Detail[],
): Promise<'repaired' | 'skipped'> {
  const priorAttempts: { syntax: string; reason: string }[] = [];
  let best: RepairSuggestion | null = null;
  let bestCount = 0;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const raw = await askModel(
      buildRepairPrompt({
        query: candidate.query,
        failedTranslation: candidate.last_translation,
        priorAttempts,
      }),
    );
    if (!raw) break;

    const suggestion = parseRepairResponse(raw, candidate.query);
    if (!suggestion || suggestion.confidence < MIN_CONFIDENCE) {
      priorAttempts.push({
        syntax: suggestion?.scryfallSyntax ?? '(none)',
        reason: 'confidence too low',
      });
      continue;
    }

    // Reject hallucinated otag: values before spending a Scryfall round-trip.
    const otagCheck = validateOtags(suggestion.scryfallSyntax);
    if (!otagCheck.valid) {
      priorAttempts.push({
        syntax: suggestion.scryfallSyntax,
        reason: otagCheck.reason ?? 'invalid oracle tag',
      });
      logger.warn('invalid_otag_rejected', {
        query: candidate.query,
        syntax: suggestion.scryfallSyntax,
        invalidTags: otagCheck.unknownTags,
      });
      continue;
    }

    await sleep(SCRYFALL_DELAY_MS);
    const check = await checkScryfall(suggestion.scryfallSyntax);
    const threshold = minResultsFor(suggestion.scryfallSyntax);
    if (check.ok && check.totalCards >= threshold) {
      best = suggestion;
      bestCount = check.totalCards;
      break;
    }
    priorAttempts.push({
      syntax: suggestion.scryfallSyntax,
      reason: check.error
        ? `Scryfall rejected the query: ${check.error}`
        : `only ${check.totalCards} results`,
    });
  }

  if (!best) {
    details.push({
      phase: 'repair',
      query: candidate.query,
      status: 'unrepairable',
      attempts: priorAttempts,
    });
    return 'skipped';
  }

  const { error } = await supabase.from('translation_rules').insert({
    pattern: candidate.query,
    scryfall_syntax: best.scryfallSyntax,
    description:
      best.description || `Self-healed from ${candidate.frequency} failed searches`,
    confidence: best.confidence,
    is_active: true,
    auto_generated: true,
    verification_state: 'probation',
    last_verified_at: new Date().toISOString(),
    verified_result_count: bestCount,
  });

  if (error) {
    details.push({
      phase: 'repair',
      query: candidate.query,
      status: 'insert_failed',
      error: error.message,
    });
    return 'skipped';
  }

  details.push({
    phase: 'repair',
    query: candidate.query,
    status: 'installed',
    syntax: best.scryfallSyntax,
    results: bestCount,
    frequency: candidate.frequency,
    sources: candidate.sources,
  });
  logger.info('rule_installed', {
    query: candidate.query,
    syntax: best.scryfallSyntax,
    results: bestCount,
  });
  return 'repaired';
}

serve(
  withLogging('self-heal-search', async (req) => {
    const corsHeaders = getCorsHeaders(req);
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const authCheck = await requireServiceOrPipelineKey(req, corsHeaders);
    if (!authCheck.authorized) return authCheck.response;

    const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    // One self-heal run at a time; overlapping runs would re-repair the same
    // queries and double-count probation failures.
    const lease = await acquireJobLock('self-heal-search', 900);
    if (!lease.acquired) return lockBusyResponse('self-heal-search', jsonHeaders);

    const startedAt = Date.now();
    const details: Detail[] = [];

    const { data: runRow } = await supabase
      .from('self_heal_runs')
      .insert({ status: 'running' })
      .select('id')
      .maybeSingle();
    const runId = (runRow as { id: string } | null)?.id ?? null;

    try {
      const { verified, rolledBack } = await verifyProbationRules(details);

      const candidates = await harvestCandidates();
      let repaired = 0;
      let skipped = 0;
      let processed = 0;

      for (const candidate of candidates) {
        if (processed >= MAX_CANDIDATES) break;
        if (
          (await ruleExists(candidate.query)) ||
          (await previouslyRejected(candidate.query))
        ) {
          skipped++;
          continue;
        }
        processed++;
        const outcome = await repairCandidate(candidate, details);
        if (outcome === 'repaired') repaired++;
        else skipped++;
      }

      const summary = {
        candidates: candidates.length,
        repaired,
        verified,
        rolled_back: rolledBack,
        skipped,
        status: 'completed',
        finished_at: new Date().toISOString(),
        details: details.slice(0, 100),
      };

      if (runId) {
        await supabase.from('self_heal_runs').update(summary).eq('id', runId);
      }

      logger.info('self_heal_complete', {
        ...summary,
        details: undefined,
        durationMs: Date.now() - startedAt,
      });

      return new Response(
        JSON.stringify({ success: true, runId, ...summary }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error('self_heal_failed', { error: message });
      if (runId) {
        await supabase
          .from('self_heal_runs')
          .update({
            status: 'failed',
            finished_at: new Date().toISOString(),
            details: [...details, { phase: 'fatal', error: message }],
          })
          .eq('id', runId);
      }
      return new Response(
        JSON.stringify({ success: false, error: 'Self-heal run failed' }),
        {
          status: 500,
          headers: jsonHeaders,
        },
      );
    } finally {
      await lease.release();
    }
  }),
);
