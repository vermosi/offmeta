/**
 * Fix Zero Results Edge Function
 *
 * Daily cron job that identifies top zero-result search queries,
 * uses AI to generate better Scryfall translations, validates them,
 * and either auto-promotes high-confidence fixes to translation_rules
 * or flags low-confidence ones for manual admin review.
 *
 * @module fix-zero-results
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { validateEnv } from '../_shared/env.ts';
import { createLogger } from '../_shared/logger.ts';

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LOVABLE_API_KEY } =
  validateEnv(['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'LOVABLE_API_KEY']);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const logger = createLogger('fix-zero-results');

/** Minimum occurrences before we consider fixing a query */
const MIN_FREQUENCY = 3;
/** Max queries to process per run */
const MAX_QUERIES = 15;
/** Look-back window in days */
const LOOKBACK_DAYS = 7;
/** Confidence threshold for auto-promotion */
const AUTO_PROMOTE_CONFIDENCE = 0.85;
/** Minimum Scryfall results to consider a fix valid */
const MIN_SCRYFALL_RESULTS = 1;
/** Delay between Scryfall API calls (ms) to respect rate limits */
const SCRYFALL_DELAY_MS = 120;

const SCRYFALL_OTAGS = [
  'otag:ramp', 'otag:mana-rock', 'otag:mana-dork', 'otag:mana-doubler',
  'otag:draw', 'otag:cantrip', 'otag:loot', 'otag:wheel', 'otag:impulse-draw',
  'otag:tutor', 'otag:removal', 'otag:spot-removal', 'otag:creature-removal',
  'otag:artifact-removal', 'otag:enchantment-removal', 'otag:board-wipe',
  'otag:graveyard-hate', 'otag:recursion', 'otag:reanimate', 'otag:counter',
  'otag:lifegain', 'otag:burn', 'otag:fog', 'otag:blink', 'otag:flicker',
  'otag:copy', 'otag:clone', 'otag:hatebear', 'otag:pillowfort', 'otag:theft',
  'otag:sacrifice-outlet', 'otag:free-sacrifice-outlet', 'otag:death-trigger',
  'otag:extra-turn', 'otag:extra-combat', 'otag:landfall', 'otag:extra-land',
  'otag:enchantress', 'otag:lord', 'otag:anthem', 'otag:cost-reducer',
  'otag:mill', 'otag:self-mill', 'otag:counters-matter', 'otag:overrun',
];

interface ZeroResultCandidate {
  query: string;
  frequency: number;
  last_translation: string;
}

interface FixResult {
  query: string;
  status: 'auto_promoted' | 'flagged_for_review' | 'validation_failed' | 'skipped' | 'error';
  newSyntax?: string;
  confidence?: number;
  scryfallResults?: number;
  reason?: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Find the top zero-result queries from translation_logs.
 */
async function getZeroResultCandidates(): Promise<ZeroResultCandidate[]> {
  const since = new Date();
  since.setDate(since.getDate() - LOOKBACK_DAYS);

  const { data, error } = await supabase.rpc('get_zero_result_candidates' as never, {
    since_date: since.toISOString(),
    min_frequency: MIN_FREQUENCY,
    max_results: MAX_QUERIES,
  });

  if (error) {
    // Fallback: raw query if RPC doesn't exist yet
    logger.warn('rpc_fallback', { error: error.message });
    return await getZeroResultCandidatesFallback(since);
  }

  return (data as ZeroResultCandidate[]) ?? [];
}

async function getZeroResultCandidatesFallback(since: Date): Promise<ZeroResultCandidate[]> {
  // Query translation_logs directly for zero-result queries
  const { data, error } = await supabase
    .from('translation_logs')
    .select('natural_language_query, translated_query, result_count')
    .eq('result_count', 0)
    .gte('created_at', since.toISOString())
    .not('natural_language_query', 'ilike', '%ping warmup%')
    .not('natural_language_query', 'ilike', '%warmup%')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error || !data) return [];

  // Group by query and count frequency
  const queryMap = new Map<string, { frequency: number; lastTranslation: string }>();
  for (const row of data) {
    const key = row.natural_language_query.toLowerCase().trim();
    const existing = queryMap.get(key);
    if (existing) {
      existing.frequency++;
    } else {
      queryMap.set(key, {
        frequency: 1,
        lastTranslation: row.translated_query || '',
      });
    }
  }

  // Filter by minimum frequency, sort by frequency desc
  const candidates: ZeroResultCandidate[] = [];
  for (const [query, info] of queryMap.entries()) {
    if (info.frequency >= MIN_FREQUENCY) {
      candidates.push({
        query,
        frequency: info.frequency,
        last_translation: info.lastTranslation,
      });
    }
  }

  candidates.sort((a, b) => b.frequency - a.frequency);
  return candidates.slice(0, MAX_QUERIES);
}

/**
 * Check if a translation rule already exists for this query.
 */
async function ruleExists(query: string): Promise<boolean> {
  const { data } = await supabase
    .from('translation_rules')
    .select('id')
    .ilike('pattern', query)
    .is('archived_at', null)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

/**
 * Use AI to generate a better Scryfall translation.
 */
async function generateFix(
  query: string,
  failedTranslation: string,
): Promise<{ pattern: string; scryfall_syntax: string; description: string; confidence: number } | null> {
  const prompt = `You are a Scryfall query expert. A user searched for "${query}" but the translation "${failedTranslation}" returned ZERO results.

AVAILABLE SCRYFALL ORACLE TAGS (otag:) — prefer these over o:"..." when applicable:
${SCRYFALL_OTAGS.join(', ')}

Your task:
1. Understand what the user ACTUALLY wanted
2. Generate a WORKING Scryfall query that WILL return results
3. Use otag: tags when they match the concept
4. Use broader terms if needed — better to return some results than zero

Common fixes:
- Remove overly restrictive type/color/format constraints
- Use otag: tags instead of fragile oracle text matching
- Simplify compound queries
- Fix quoting issues in o:"..." searches
- For card names, use !"Card Name" (exact name match)

IMPORTANT: If the query looks like a specific card name (e.g. "lightning bolt", "sol ring"), use !"Card Name" syntax.

Respond in this EXACT JSON format only:
{
  "pattern": "${query}",
  "scryfall_syntax": "working scryfall query",
  "description": "brief explanation",
  "confidence": 0.8
}

Rules:
- scryfall_syntax must be valid Scryfall syntax
- confidence: 0.5-1.0 based on certainty
- If you cannot determine a fix, set confidence to 0
- Only output the JSON object, nothing else.`;

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
      logger.error('ai_api_error', { status: response.status });
      return null;
    }

    const aiData = await response.json();
    const aiResponse = aiData.choices?.[0]?.message?.content || '';

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalize tag aliases
    if (parsed.scryfall_syntax) {
      parsed.scryfall_syntax = parsed.scryfall_syntax
        .replace(/\bfunction:/gi, 'otag:')
        .replace(/\boracletag:/gi, 'otag:');
    }

    return parsed;
  } catch (err) {
    logger.error('ai_generation_error', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Validate a Scryfall query returns results.
 */
async function validateScryfall(
  query: string,
): Promise<{ valid: boolean; totalCards: number }> {
  try {
    const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&page=1`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'OffMeta/1.0 (zero-result-fixer)' },
    });

    if (resp.status === 200) {
      const data = await resp.json();
      return { valid: (data.total_cards ?? 0) >= MIN_SCRYFALL_RESULTS, totalCards: data.total_cards ?? 0 };
    }

    // Consume body
    await resp.text();
    return { valid: false, totalCards: 0 };
  } catch {
    // Network error — treat as inconclusive, skip
    return { valid: false, totalCards: 0 };
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const auth = await validateAuth(req);
  if (!auth.authorized) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const startTime = Date.now();

  try {
    logger.info('fix_zero_results_started', {
      lookbackDays: LOOKBACK_DAYS,
      minFrequency: MIN_FREQUENCY,
      maxQueries: MAX_QUERIES,
    });

    // 1. Get top zero-result candidates
    const candidates = await getZeroResultCandidates();

    if (candidates.length === 0) {
      logger.info('no_zero_result_candidates', {});
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: 'No zero-result queries found above threshold',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    logger.info('candidates_found', { count: candidates.length });

    const results: FixResult[] = [];
    let autoPromoted = 0;
    let flagged = 0;

    // 2. Process each candidate
    for (const candidate of candidates) {
      try {
        // Skip if rule already exists
        if (await ruleExists(candidate.query)) {
          results.push({ query: candidate.query, status: 'skipped', reason: 'Rule already exists' });
          continue;
        }

        // Generate AI fix
        const fix = await generateFix(candidate.query, candidate.last_translation);

        if (!fix || fix.confidence < 0.5 || !fix.scryfall_syntax) {
          results.push({ query: candidate.query, status: 'skipped', reason: 'AI could not generate fix' });
          continue;
        }

        // Validate against Scryfall
        await sleep(SCRYFALL_DELAY_MS);
        const validation = await validateScryfall(fix.scryfall_syntax);

        if (!validation.valid) {
          results.push({
            query: candidate.query,
            status: 'validation_failed',
            newSyntax: fix.scryfall_syntax,
            confidence: fix.confidence,
            scryfallResults: validation.totalCards,
            reason: 'Scryfall returned no results for generated query',
          });
          continue;
        }

        // Decide: auto-promote or flag for review
        if (fix.confidence >= AUTO_PROMOTE_CONFIDENCE && validation.totalCards >= 5) {
          // Auto-promote to translation_rules
          const { error: insertError } = await supabase
            .from('translation_rules')
            .insert({
              pattern: fix.pattern || candidate.query,
              scryfall_syntax: fix.scryfall_syntax,
              description: fix.description || `Auto-fixed: ${candidate.query}`,
              confidence: fix.confidence,
              is_active: true,
            });

          if (insertError) {
            logger.warn('insert_rule_error', { error: insertError.message, query: candidate.query });
            results.push({ query: candidate.query, status: 'error', reason: insertError.message });
          } else {
            autoPromoted++;
            results.push({
              query: candidate.query,
              status: 'auto_promoted',
              newSyntax: fix.scryfall_syntax,
              confidence: fix.confidence,
              scryfallResults: validation.totalCards,
            });
            logger.info('auto_promoted_rule', {
              query: candidate.query,
              syntax: fix.scryfall_syntax,
              results: validation.totalCards,
            });
          }
        } else {
          // Flag for manual review via search_feedback
          flagged++;
          await supabase.from('search_feedback').insert({
            original_query: candidate.query,
            translated_query: fix.scryfall_syntax,
            issue_description: `[AUTO] Zero-result fix suggestion (${candidate.frequency} occurrences, AI confidence: ${fix.confidence}, Scryfall results: ${validation.totalCards}). ${fix.description}`,
            processing_status: 'pending',
            scryfall_validation_count: validation.totalCards,
          });

          results.push({
            query: candidate.query,
            status: 'flagged_for_review',
            newSyntax: fix.scryfall_syntax,
            confidence: fix.confidence,
            scryfallResults: validation.totalCards,
          });
          logger.info('flagged_for_review', {
            query: candidate.query,
            confidence: fix.confidence,
            results: validation.totalCards,
          });
        }
      } catch (err) {
        logger.error('candidate_processing_error', {
          query: candidate.query,
          error: err instanceof Error ? err.message : String(err),
        });
        results.push({ query: candidate.query, status: 'error', reason: String(err) });
      }
    }

    const responseTimeMs = Date.now() - startTime;

    logger.info('fix_zero_results_complete', {
      processed: results.length,
      autoPromoted,
      flagged,
      responseTimeMs,
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        autoPromoted,
        flaggedForReview: flagged,
        results,
        responseTimeMs,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    logger.error('fix_zero_results_error', {
      error: error instanceof Error ? error.message : String(error),
      responseTimeMs,
    });

    return new Response(
      JSON.stringify({ success: false, error: 'Fix zero results failed', responseTimeMs }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
