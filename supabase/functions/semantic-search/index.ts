import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { buildDeterministicIntent } from './deterministic/index.ts';
import { lookupCardName } from './card-name-lookup.ts';
import { buildSystemPrompt, type QueryTier } from './prompts.ts';
import { getCorsHeaders } from '../_shared/auth.ts';
import { LOVABLE_API_KEY, supabase } from './client.ts';
import {
  getCachedResult,
  setCachedResult,
  getPersistentCache,
  setPersistentCache,
  maybeCacheCleanup,
} from './cache.ts';
import { fetchWithRetry, fetchWithTimeout } from './utils.ts';
import {
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
} from './circuit-breaker.ts';
import { checkPatternMatch } from './matching.ts';
import { fetchDynamicRules } from './rules.ts';

import { DEFAULT_OVERLY_BROAD_THRESHOLD } from './constants.ts';
import {
  validateQuery,
  detectQualityFlags,
  applyAutoCorrections,
  runValidationTables,
  sanitizeInputQuery,
} from './validation.ts';
import { buildFallbackQuery, applyFiltersToQuery } from './fallback.ts';
import { logTranslation, createLogger, flushLogQueue } from './logging.ts';
import { runPipeline, type PipelineContext } from './pipeline/index.ts';
import {
  validateAIResponse,
  extractAIContent,
  parseAIContent,
} from './schemas.ts';
import { VALID_SEARCH_KEYS } from './constants.ts';
import {
  AI_FETCH_TIMEOUT_MS,
  AI_MAX_RETRIES,
  REQUEST_BUDGET_MS,
  REQUEST_STAGE_MIN_BUDGET_MS,
  PRE_TRANSLATION_TIMEOUT_MS,
} from './config.ts';
import {
  enforceRequestGuards,
  errorResponse,
  handleCorsPreflight,
  parseJsonBody,
  parseRequestBudget,
  sanitizeError,
} from './handlers/http.ts';

type BudgetStage = 'dynamic_rules' | 'pre_translation' | 'ai_call';

/**
 * Check if a query is already valid Scryfall syntax (no AI needed).
 * Detects queries that use Scryfall operators like t:, c:, o:, mv, pow, etc.
 */
function isRawScryfallSyntax(query: string): boolean {
  // Must contain at least one Scryfall operator
  const operatorPattern = /\b([a-zA-Z]+)[:=<>]/;
  if (!operatorPattern.test(query)) return false;

  // Extract all tokens that look like operators
  const tokens = query.split(/\s+/);
  const operatorTokens = tokens.filter((t) => /^-?[a-zA-Z]+[:=<>]/.test(t));

  // If most tokens are operator-based, it's raw syntax
  if (operatorTokens.length === 0) return false;

  // Check that the operators are valid Scryfall keys
  for (const token of operatorTokens) {
    const keyMatch = token.match(/^-?([a-zA-Z]+)[:=<>]/);
    if (keyMatch) {
      const key = keyMatch[1].toLowerCase();
      if (
        !VALID_SEARCH_KEYS.has(key) &&
        ![
          'kw',
          'otag',
          'atag',
          'in',
          'is',
          'not',
          'has',
          'set',
          'cn',
          'year',
          'game',
          'banned',
          'restricted',
          'unique',
          'order',
          'direction',
          'prefer',
          'prints',
          'new',
          'cheapest',
          'usd',
          'eur',
          'tix',
          'border',
          'frame',
          'stamp',
          'watermark',
          'art',
          'flavor',
          'lore',
          'include',
          'language',
          'date',
          'mana',
          'wildpair',
        ].includes(key)
      ) {
        return false; // Contains invalid operator
      }
    }
  }

  // Non-operator words should be minimal (allow OR, AND, NOT, parens, quotes)
  const nonOperatorTokens = tokens.filter(
    (t) =>
      !/^-?[a-zA-Z]+[:=<>]/.test(t) &&
      !['or', 'and', 'not', '-'].includes(t.toLowerCase()) &&
      !t.startsWith('(') &&
      !t.startsWith(')') &&
      !t.startsWith('"'),
  );

  // If more than 30% of tokens are natural language, it's not raw syntax
  return nonOperatorTokens.length <= tokens.length * 0.3;
}

/**
 * Auto-seed high-confidence AI translations into translation_rules
 * so future identical queries hit the pattern match layer instead of AI.
 */
async function seedTranslationRule(
  query: string,
  scryfallQuery: string,
  confidence: number,
): Promise<void> {
  try {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    // Don't seed very short or very long queries
    if (normalized.length < 5 || normalized.length > 200) return;

    await supabase
      .from('translation_rules')
      .insert({
        pattern: normalized,
        scryfall_syntax: scryfallQuery,
        confidence,
        description: `Auto-seeded from AI translation`,
        is_active: true,
      })
      .then(({ error }) => {
        // Silently ignore duplicate key conflicts — preserves admin-curated rules
        if (error && !error.message?.includes('duplicate key')) {
          console.warn('seedTranslationRule insert error:', error.message);
        }
      });
  } catch {
    // Silently fail - this is an optimization, not critical
  }
}

// Run self-checks on startup if enabled
if (Deno.env.get('RUN_QUERY_VALIDATION_CHECKS') === 'true') {
  runValidationTables();
}

// Type definitions
interface DebugOptions {
  forceFallback?: boolean;
  simulateAiFailure?: boolean;
  overlyBroadThreshold?: number;
  usePipeline?: boolean; // Enable new pipeline
  validateScryfall?: boolean;
}

interface RequestFilters {
  format?: string;
  colorIdentity?: string[];
  maxCmc?: number;
}

type StageName =
  | 'deterministic'
  | 'cache'
  | 'pattern'
  | 'preTranslate'
  | 'ai'
  | 'fallback';

const ACCENTED_LATIN_HIGH_CONFIDENCE_THRESHOLD = 0.9;

interface EdgeRuntimeLike {
  waitUntil: (promise: Promise<unknown>) => void;
}

function runInBackground(task: Promise<unknown>): void {
  const maybeEdgeRuntime = (globalThis as { EdgeRuntime?: EdgeRuntimeLike })
    .EdgeRuntime;
  if (maybeEdgeRuntime?.waitUntil) {
    maybeEdgeRuntime.waitUntil(task);
    return;
  }

  task.catch(() => {});
}

/**
 * Main Edge Function Handler
 */
serve(async (req) => {
  // Trigger periodic in-memory cache cleanup (serverless-safe)
  maybeCacheCleanup();

  const corsHeaders = getCorsHeaders(req);

  const preflightResponse = handleCorsPreflight(req, corsHeaders);
  if (preflightResponse) {
    return preflightResponse;
  }

  const requestStartTime = Date.now();
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const { logInfo, logWarn } = createLogger(requestId);
  const stageDurationsMs: Partial<Record<StageName, number>> = {};

  const markStage = async <T>(
    stage: StageName,
    task: () => Promise<T> | T,
  ): Promise<T> => {
    const stageStartTime = Date.now();
    try {
      return await task();
    } finally {
      stageDurationsMs[stage] = Date.now() - stageStartTime;
    }
  };

  const getPerfLogFields = (source: string, responseTimeMs: number) => ({
    source,
    responseTimeMs,
    stageDurationsMs: {
      deterministic: stageDurationsMs.deterministic ?? null,
      cache: stageDurationsMs.cache ?? null,
      pattern: stageDurationsMs.pattern ?? null,
      preTranslate: stageDurationsMs.preTranslate ?? null,
      ai: stageDurationsMs.ai ?? null,
      fallback: stageDurationsMs.fallback ?? null,
    },
  });

  const jsonHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'x-request-id': requestId,
  };

  const guardFailureResponse = await enforceRequestGuards(
    req,
    jsonHeaders,
    logWarn,
  );
  if (guardFailureResponse) {
    return guardFailureResponse;
  }

  const parsedBody = await parseJsonBody(req, jsonHeaders, logWarn);
  if ('response' in parsedBody) {
    return parsedBody.response;
  }
  const requestBody = parsedBody.requestBody;

  try {
    const {
      query: rawQuery,
      filters: rawFilters,
      debug,
      useCache,
      cacheSalt,
    } = requestBody;
    const query = rawQuery as string;
    const filters = (rawFilters ?? null) as Record<string, unknown> | null;
    const requestBudget = parseRequestBudget(
      req,
      requestStartTime,
      REQUEST_BUDGET_MS,
    );

    const createBudgetExceededResponse = (): Response => {
      const fallback = buildFallbackQuery(query, filters);
      return new Response(
        JSON.stringify({
          originalQuery: query,
          scryfallQuery: fallback.sanitized,
          explanation: {
            readable: `Searching for: ${query}`,
            assumptions: ['Request budget exceeded - using fallback'],
            confidence: 0.5,
          },
          success: true,
          fallback: true,
          source: 'budget_fallback',
        }),
        { headers: jsonHeaders },
      );
    };

    // Type-safe debug options
    const debugOptions: DebugOptions =
      debug && typeof debug === 'object' ? (debug as DebugOptions) : {};
    const shouldForceFallback = Boolean(
      debugOptions.forceFallback || debugOptions.simulateAiFailure,
    );
    const overlyBroadThreshold =
      debugOptions.overlyBroadThreshold ?? DEFAULT_OVERLY_BROAD_THRESHOLD;

    // 1. Input Validation
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return errorResponse('Query is required', 400, jsonHeaders);
    }

    if (query.length > 500) {
      return errorResponse(
        'Query too long (max 500 characters)',
        400,
        jsonHeaders,
      );
    }

    // 1.5 Input Sanitization - Reject malformed/spam queries early
    const sanitizationResult = sanitizeInputQuery(query);
    if (!sanitizationResult.valid) {
      logWarn('input_sanitization_rejected', {
        query: query.substring(0, 50),
        reason: sanitizationResult.reason,
      });
      return errorResponse(
        sanitizationResult.reason || 'Invalid query format',
        400,
        jsonHeaders,
      );
    }

    // Validate filters if provided
    if (filters !== undefined && filters !== null) {
      if (typeof filters !== 'object' || Array.isArray(filters)) {
        return errorResponse('Invalid filters format', 400, jsonHeaders);
      }

      const typedFilters = filters as RequestFilters;

      if (typedFilters.format && typeof typedFilters.format !== 'string') {
        return errorResponse('Invalid format type', 400, jsonHeaders);
      }

      if (typedFilters.colorIdentity !== undefined) {
        if (!Array.isArray(typedFilters.colorIdentity)) {
          return errorResponse('Invalid colorIdentity type', 400, jsonHeaders);
        }
        if (typedFilters.colorIdentity.length > 5) {
          return errorResponse(
            'Invalid color identity (max 5 colors)',
            400,
            jsonHeaders,
          );
        }
      }

      if (typedFilters.maxCmc !== undefined) {
        if (
          typeof typedFilters.maxCmc !== 'number' ||
          typedFilters.maxCmc < 0 ||
          typedFilters.maxCmc > 20
        ) {
          return errorResponse(
            'Invalid max CMC (must be 0-20)',
            400,
            jsonHeaders,
          );
        }
      }
    }

    // Validate useCache
    if (useCache !== undefined && typeof useCache !== 'boolean') {
      return errorResponse('Invalid useCache type', 400, jsonHeaders);
    }

    // Validate cacheSalt
    if (cacheSalt !== undefined && typeof cacheSalt !== 'string') {
      return errorResponse('Invalid cacheSalt type', 400, jsonHeaders);
    }

    // 2. Forced Fallback / Core Tests (Debug Mode)
    if (shouldForceFallback) {
      const fallbackResult = await markStage('fallback', () =>
        Promise.resolve(buildFallbackQuery(query, filters)),
      );
      const responseTimeMs = Date.now() - requestStartTime;
      logInfo(
        'request_completed',
        getPerfLogFields('forced_fallback', responseTimeMs),
      );

      return new Response(
        JSON.stringify({
          originalQuery: query,
          scryfallQuery: fallbackResult.sanitized,
          explanation: {
            readable: `Searching for: ${query}`,
            assumptions: ['Using forced fallback translation'],
            confidence: 0.6,
          },
          validationIssues: fallbackResult.issues,
          responseTimeMs,
          success: true,
          fallback: true,
          source: 'forced_fallback',
        }),
        { headers: jsonHeaders },
      );
    }

    // 2.5. Fast-path for card-name queries (skip cache/pattern/AI entirely)
    // First check DB for known card names, then fall back to heuristic for capitalized queries.
    const queryWords = query.trim().split(/\s+/);
    const hasSearchKeywords = /\b(with|that|under|below|above|less|more|cheap|budget|from|legal|commander|deck|spells?|cards?|creatures?|artifacts?|enchantments?|lands?|instants?|sorcery|sorceries)\b/i.test(query);

    // DB lookup: exact card name match (async, ~1ms from in-memory cache)
    const isKnownCard = !hasSearchKeywords && queryWords.length <= 6
      ? await markStage('card_name_lookup', () => lookupCardName(query))
      : false;

    // Heuristic fallback for capitalized queries not in DB
    const isFastNameCandidate = !isKnownCard &&
      queryWords.length <= 6 &&
      queryWords.length >= 1 &&
      queryWords.every(
        (w: string) =>
          /^[A-Z]/.test(w) || /^(of|the|and|to|in|for|a|an)$/i.test(w),
      ) &&
      !hasSearchKeywords;

    if (isKnownCard || isFastNameCandidate) {
      const fastResult = await markStage('deterministic', () =>
        Promise.resolve(buildDeterministicIntent(query, { isKnownCardName: isKnownCard })),
      );
      const fastQuery = applyFiltersToQuery(
        fastResult.deterministicQuery,
        filters,
      );
      if (fastQuery && !fastResult.intent.remainingQuery) {
        const validation = validateQuery(fastQuery);
        const responseTimeMs = Date.now() - requestStartTime;
        logTranslation(
          query,
          validation.sanitized,
          isKnownCard ? 0.95 : 0.9,
          responseTimeMs,
          [],
          [],
          filters,
          false,
          'deterministic',
        );
        flushLogQueue();

        return new Response(
          JSON.stringify({
            originalQuery: query,
            scryfallQuery: validation.sanitized,
            explanation: {
              readable: `Searching for: ${query}`,
              assumptions: fastResult.intent.warnings,
              confidence: isKnownCard ? 0.95 : 0.9,
            },
            success: true,
            source: 'deterministic',
          }),
          { headers: jsonHeaders },
        );
      }
    }

    // 2.6. New Pipeline Mode (opt-in via debug flag)
    const usePipeline = Boolean(debugOptions.usePipeline);
    if (usePipeline) {
      const pipelineContext: PipelineContext = {
        requestId,
        startTime: requestStartTime,
        options: {
          useCache,
          cacheSalt,
          validateWithScryfall: Boolean(debugOptions.validateScryfall),
          overlyBroadThreshold,
          debug: true,
        },
        filters: filters as RequestFilters,
      };

      const pipelineResult = await runPipeline(query, pipelineContext);

      // Cache successful results
      if (useCache && pipelineResult.explanation.confidence >= 0.8) {
        const cachePayload = {
          scryfallQuery: pipelineResult.finalQuery,
          explanation: pipelineResult.explanation,
          showAffiliate: true,
        };
        setCachedResult(query, filters, cachePayload, cacheSalt);
        setPersistentCache(query, filters, cachePayload, cacheSalt);
      }

      return new Response(
        JSON.stringify({
          originalQuery: query,
          scryfallQuery: pipelineResult.finalQuery,
          explanation: pipelineResult.explanation,
          intent: pipelineResult.intent,
          slots: pipelineResult.slots,
          concepts: pipelineResult.concepts.map((c) => ({
            id: c.conceptId,
            confidence: c.confidence,
            category: c.category,
          })),
          responseTimeMs: pipelineResult.responseTimeMs,
          success: true,
          source: pipelineResult.source,
          debug: pipelineResult.debug,
        }),
        { headers: jsonHeaders },
      );
    }

    // 3. Cache Lookups (In-Memory then Persistent) — run in parallel with deterministic build
    const [deterministicResult, cachedFromParallel] = await Promise.all([
      markStage('deterministic', () =>
        Promise.resolve(buildDeterministicIntent(query, { isKnownCardName: isKnownCard })),
      ),
      markStage('cache', () =>
        useCache
          ? Promise.all([
              getCachedResult(query, filters, cacheSalt),
              getPersistentCache(query, filters, cacheSalt),
            ]).then(([mem, persistent]) => mem || persistent)
          : Promise.resolve(null),
      ),
    ]);

    const deterministicQuery = applyFiltersToQuery(
      deterministicResult.deterministicQuery,
      filters,
    );

    if (useCache) {
      const cached = cachedFromParallel;

      if (cached) {
        const responseTimeMs = Date.now() - requestStartTime;
        logInfo('cache_hit', { query: query.substring(0, 50), responseTimeMs });
        logInfo('request_completed', getPerfLogFields('cache', responseTimeMs));
        logTranslation(
          query,
          cached.scryfallQuery,
          cached.explanation?.confidence ?? 0.9,
          responseTimeMs,
          [],
          [],
          filters,
          false,
          'cache',
        );
        flushLogQueue(); // fire-and-forget — don't block the response

        return new Response(
          JSON.stringify({
            originalQuery: query,
            ...cached,
            responseTimeMs: responseTimeMs,
            success: true,
            cached: true,
            source: 'cache',
          }),
          { headers: jsonHeaders },
        );
      }
    }

    // 4. Pattern Matching (Known queries)
    const patternMatch = await markStage('pattern', () =>
      checkPatternMatch(query, filters),
    );
    if (patternMatch) {
      const responseTimeMs = Date.now() - requestStartTime;
      logInfo('pattern_match_hit', {
        query: query.substring(0, 50),
        responseTimeMs,
      });
      logInfo(
        'request_completed',
        getPerfLogFields('pattern_match', responseTimeMs),
      );

      setCachedResult(query, filters, patternMatch, cacheSalt);
      logTranslation(
        query,
        patternMatch.scryfallQuery,
        patternMatch.explanation?.confidence ?? 0.85,
        responseTimeMs,
        [],
        [],
        filters,
        false,
        'pattern_match',
      );
      flushLogQueue(); // fire-and-forget

      return new Response(
        JSON.stringify({
          originalQuery: query,
          ...patternMatch,
          responseTimeMs: responseTimeMs,
          success: true,
          source: 'pattern_match',
        }),
        { headers: jsonHeaders },
      );
    }

    // 5. Circuit Breaker / AI Availability Check
    if (isCircuitOpen() || !LOVABLE_API_KEY) {
      logWarn('ai_unavailable', {
        reason: isCircuitOpen() ? 'circuit_open' : 'missing_api_key',
      });
      const fallback = await markStage('fallback', () =>
        Promise.resolve(buildFallbackQuery(query, filters)),
      );
      const responseTimeMs = Date.now() - requestStartTime;
      logInfo(
        'request_completed',
        getPerfLogFields('fallback', responseTimeMs),
      );
      return new Response(
        JSON.stringify({
          originalQuery: query,
          scryfallQuery: fallback.sanitized,
          explanation: {
            readable: `Searching for: ${query}`,
            assumptions: [
              'AI temporarily unavailable - using simplified search',
            ],
            confidence: 0.6,
          },
          responseTimeMs,
          success: true,
          fallback: true,
          source: 'fallback',
        }),
        { headers: jsonHeaders },
      );
    }

    // 6. Raw Scryfall syntax detection (skip AI for already-valid queries)
    // No Scryfall validation here — raw syntax is trusted, validation adds latency with no benefit.
    const trimmedQuery = query.trim();
    if (isRawScryfallSyntax(trimmedQuery)) {
      const validation = validateQuery(trimmedQuery);
      const responseTimeMs = Date.now() - requestStartTime;
      logInfo('raw_syntax_passthrough', {
        query: trimmedQuery.substring(0, 50),
        responseTimeMs,
      });
      logInfo(
        'request_completed',
        getPerfLogFields('raw_syntax', responseTimeMs),
      );
      logTranslation(
        query,
        validation.sanitized,
        0.95,
        responseTimeMs,
        [],
        [],
        filters,
        false,
        'raw_syntax',
      );
      flushLogQueue(); // fire-and-forget

      const rawResult = {
        scryfallQuery: validation.sanitized,
        explanation: {
          readable: `Direct Scryfall syntax: ${trimmedQuery}`,
          assumptions: [],
          confidence: 0.95,
        },
        showAffiliate: true,
      };

      setCachedResult(query, filters, rawResult, cacheSalt);

      return new Response(
        JSON.stringify({
          originalQuery: query,
          ...rawResult,
          responseTimeMs,
          success: true,
          source: 'raw_syntax',
        }),
        { headers: jsonHeaders },
      );
    }

    // Noise words that don't carry search intent — used for deterministic and concept matching
    const RESIDUAL_NOISE_WORDS = /\b(in|that|the|a|an|and|or|for|with|of|to|from|are|is|be|my|your|its|cards?|spells?|good|best|great|nice|cool|top|find|some|any|also|really|very|most|all|every|each|other)\b/gi;

    // 6b. Deterministic Result check (can we skip AI?)
    // Skip Scryfall network validation — deterministic results are pre-validated, validation adds latency.
    // Strip noise words from remaining to avoid falling through for trivial residuals like "good", "best"
    const deterministicRemaining = (deterministicResult.intent.remainingQuery || '')
      .replace(RESIDUAL_NOISE_WORDS, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (deterministicQuery && deterministicRemaining.length < 3) {
      const validation = validateQuery(deterministicQuery || query);
      const responseTimeMs = Date.now() - requestStartTime;
      logInfo(
        'request_completed',
        getPerfLogFields('deterministic', responseTimeMs),
      );
      logTranslation(
        query,
        validation.sanitized,
        0.9,
        responseTimeMs,
        [],
        [],
        filters,
        false,
        'deterministic',
      );
      flushLogQueue(); // fire-and-forget

      return new Response(
        JSON.stringify({
          originalQuery: query,
          scryfallQuery: validation.sanitized,
          explanation: {
            readable: `Searching for: ${query}`,
            assumptions: deterministicResult.intent.warnings,
            confidence: 0.9,
          },
          success: true,
          source: 'deterministic',
        }),
        { headers: jsonHeaders },
      );
    }

    // 6c. Concept Matching (known MTG concepts — skip AI if high-confidence match)
    const residualForConcepts =
      deterministicResult.intent.remainingQuery || query;
    // Strip noise words to prevent garbage concept matches from trivial residuals like "in" or "that"
    // (RESIDUAL_NOISE_WORDS defined above at deterministic check)
    const meaningfulResidual = residualForConcepts.replace(RESIDUAL_NOISE_WORDS, '').replace(/\s+/g, ' ').trim();
    if (meaningfulResidual.length >= 3) {
      try {
        const { findConceptMatches } = await import('./pipeline/concepts.ts');
        const concepts = await findConceptMatches(residualForConcepts, 3, 0.7);

        if (concepts.length > 0 && concepts[0].confidence >= 0.85) {
          // Build query from concept templates, deduplicating by normalized category
          const seenCategories = new Set<string>();
          const dedupedConcepts = concepts.filter((c) => {
            // Normalize category to prevent near-duplicates
            // e.g., "Mass removal", "Mass removal spells", "Cards that destroy all creatures"
            const normCat = (c.category || '')
              .toLowerCase()
              .replace(/\b(cards?\s+that\s+|spells?\s*)/g, '')
              .trim();
            if (seenCategories.has(normCat)) return false;
            seenCategories.add(normCat);
            return true;
          });

          // Strip color constraints from concept templates when user didn't
          // specify a color (prevents "board whipe" → c:w from "white board wipes")
          const userSpecifiedColor =
            deterministicQuery &&
            /\b(c|ci)(:|<=|>=|=|<|>)\S+/i.test(deterministicQuery);
          const conceptParts = dedupedConcepts
            .map((c) => {
              let syntax = c.scryfallSyntax;
              if (!userSpecifiedColor) {
                syntax = syntax
                  .replace(/\b(c|ci)(:|<=|>=|=|<|>)\S+/gi, '')
                  .replace(/\s+/g, ' ')
                  .trim();
              }
              return syntax;
            })
            .filter(Boolean);

          let conceptQuery = conceptParts.join(' ');
          if (deterministicQuery) {
            conceptQuery = `${deterministicQuery} ${conceptQuery}`;
          }
          conceptQuery = applyFiltersToQuery(conceptQuery, filters);
          const validation = validateQuery(conceptQuery);
          const responseTimeMs = Date.now() - requestStartTime;

          logInfo('concept_match_hit', {
            query: query.substring(0, 50),
            concepts: dedupedConcepts.map((c) => c.conceptId),
            responseTimeMs,
          });
          logInfo(
            'request_completed',
            getPerfLogFields('pattern_match', responseTimeMs),
          );

          const readableDesc = dedupedConcepts
            .map((c) => c.description || c.conceptId)
            .join(', ');
          const conceptIds = dedupedConcepts.map((c) => c.conceptId).join(', ');

          setCachedResult(
            query,
            filters,
            {
              scryfallQuery: validation.sanitized,
              explanation: {
                readable: `Searching for: ${readableDesc}`,
                assumptions: [`Matched concepts: ${conceptIds}`],
                confidence: concepts[0].confidence,
              },
              showAffiliate: true,
            },
            cacheSalt,
          );

          logTranslation(
            query,
            validation.sanitized,
            concepts[0].confidence,
            responseTimeMs,
            [],
            [],
            filters,
            false,
            'concept_match',
          );
          flushLogQueue();

          return new Response(
            JSON.stringify({
              originalQuery: query,
              scryfallQuery: validation.sanitized,
              explanation: {
                readable: `Searching for: ${readableDesc}`,
                assumptions: [`Matched concepts: ${conceptIds}`],
                confidence: concepts[0].confidence,
              },
              responseTimeMs,
              success: true,
              source: 'concept_match',
            }),
            { headers: jsonHeaders },
          );
        }
      } catch (conceptErr) {
        logWarn('concept_match_error', {
          error:
            conceptErr instanceof Error
              ? conceptErr.message
              : String(conceptErr),
        });
        // Fall through to AI
      }
    }

    const buildBudgetExceededResponse = (
      stage: BudgetStage,
      confidence: number,
      assumptions: string[],
    ): Response => {
      const fallback = buildFallbackQuery(query, filters);
      const responseTimeMs = Date.now() - requestStartTime;
      const remainingBudgetMs = requestBudget.remainingMs();
      logWarn('budget_exceeded', {
        stage,
        responseTimeMs,
        remainingBudgetMs,
        deadlineMs: requestBudget.deadlineMs,
      });

      return new Response(
        JSON.stringify({
          originalQuery: query,
          scryfallQuery: fallback.sanitized,
          explanation: {
            readable: `Searching for: ${query}`,
            assumptions,
            confidence,
          },
          responseTimeMs,
          budgetExceededAtStage: stage,
          success: true,
          fallback: true,
          source: 'budget_fallback',
        }),
        { headers: jsonHeaders },
      );
    };

    // 7. Pre-translate non-English queries to English for better AI accuracy
    const remainingQuery = deterministicResult.intent.remainingQuery || '';
    let queryForAI = remainingQuery;
    let preTranslationAttempted = false;
    let preTranslationSkippedReason: string | null = null;

    // Detect non-Latin scripts or common non-English patterns
    const hasNonLatin =
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Devanagari}]/u.test(
        remainingQuery,
      );
    const hasAccentedLatin = /[àáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿ]/i.test(
      remainingQuery,
    );
    const deterministicConfidence =
      ((deterministicResult.intent as unknown as Record<string, unknown>)
        .confidence as number) ?? 0;
    const shouldPreTranslateAccentedLatin =
      hasAccentedLatin &&
      !hasNonLatin &&
      deterministicConfidence >= ACCENTED_LATIN_HIGH_CONFIDENCE_THRESHOLD;
    const looksNonEnglish = hasNonLatin || shouldPreTranslateAccentedLatin;

    if (looksNonEnglish && remainingQuery.trim().length > 0) {
      const remainingBudgetMs = requestBudget.deadlineMs - Date.now();

      if (remainingBudgetMs < REQUEST_STAGE_MIN_BUDGET_MS.preTranslation) {
        return buildBudgetExceededResponse('pre_translation', 0.58, [
          'Skipped pre-translation due to low remaining request budget',
        ]);
      } else {
        preTranslationAttempted = true;
        try {
          const preTranslateResponse = await fetchWithTimeout(
            'https://ai.gateway.lovable.dev/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash-lite',
                messages: [
                  {
                    role: 'system',
                    content:
                      'You are a translator. Translate the following Magic: The Gathering card search query into English. Preserve all MTG-specific intent (counter, destroy, exile, ramp, etc.). Output ONLY the English translation, nothing else.',
                  },
                  { role: 'user', content: remainingQuery },
                ],
                temperature: 0.0,
              }),
            },
            PRE_TRANSLATION_TIMEOUT_MS,
          );

          if (preTranslateResponse.ok) {
            const preTranslateData = await preTranslateResponse.json();
            const translated =
              preTranslateData?.choices?.[0]?.message?.content?.trim();
            if (translated && translated.length > 0) {
              logInfo('pre_translation_applied', {
                preTranslationAttempted,
                preTranslationSkippedReason,
              });
              queryForAI = translated;
            } else {
              preTranslationSkippedReason = 'empty_translation';
            }
          } else {
            preTranslationSkippedReason = 'gateway_non_ok';
          }
        } catch (e) {
          // Pre-translation failed, proceed with original query without retries.
          preTranslationSkippedReason =
            e instanceof Error && e.name === 'AbortError'
              ? 'pre_translation_timeout'
              : 'pre_translation_failure';
          logWarn('pre_translation_failed', {
            error: sanitizeError(e),
            preTranslationAttempted,
            preTranslationSkippedReason,
          });
        }
      }
    } else if (remainingQuery.trim().length === 0) {
      preTranslationSkippedReason = 'empty_remaining_query';
    } else if (hasAccentedLatin && !shouldPreTranslateAccentedLatin) {
      preTranslationSkippedReason = 'accented_latin_low_confidence';
    } else {
      preTranslationSkippedReason = 'no_strong_non_english_signal';
    }

    if (!requestBudget.hasBudgetFor(1)) {
      logWarn('request_budget_exceeded_after_pretranslate');
      return createBudgetExceededResponse();
    }

    // 7.5. Card Name Synergy Detection
    // Detect queries like "cards that help trigger Blanka's ability" and fetch the card's oracle text
    const synergyPatterns = [
      /\b(?:cards?|spells?|permanents?)\s+(?:that\s+)?(?:help|synergize|work|combo|pair|go|interact)\s+(?:with\s+)?(.+?)(?:'s?\s+(?:ability|abilities|effect|trigger|activated|static)|\s+deck|\s+strategy)?$/i,
      /\b(?:support|enable|trigger|activate)\s+(.+?)(?:'s?\s+(?:ability|abilities|effect|trigger))?$/i,
      /\b(?:synergy|synergies|synergize)\s+(?:with|for)\s+(.+?)$/i,
      /\b(?:build around|built around|around)\s+(.+?)$/i,
      /\b(?:goes? well with|pairs? with|combos? with)\s+(.+?)$/i,
    ];

    let cardSynergyContext = '';
    let detectedCardName: string | null = null;

    for (const pattern of synergyPatterns) {
      const match = queryForAI.match(pattern);
      if (match && match[1]) {
        const candidateName = match[1]
          .replace(/['"]/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        // Skip if too short or looks like a generic type
        if (
          candidateName.length >= 3 &&
          !/^(creatures?|artifacts?|enchantments?|lands?|instants?|sorcery|sorceries|spells?|planeswalkers?)$/i.test(
            candidateName,
          )
        ) {
          try {
            const cardLookup = await fetchWithTimeout(
              `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(candidateName)}`,
              {},
              3000,
            );
            if (cardLookup.ok) {
              const cardData = await cardLookup.json();
              if (cardData.oracle_text && cardData.name) {
                detectedCardName = cardData.name;
                const colorId =
                  cardData.color_identity?.join('').toLowerCase() || '';
                cardSynergyContext = `\n\nCARD CONTEXT: The user is looking for cards that synergize with "${cardData.name}" (${cardData.type_line}). Its oracle text is: "${cardData.oracle_text}". Color identity: ${colorId || 'colorless'}. Generate a Scryfall query for cards that ENABLE or SYNERGIZE with this card's mechanics. Use id<=${colorId || 'c'} if the query implies commander format. Do NOT put the card name in o:"" — other cards don't mention this card by name.`;
                logInfo('card_synergy_detected', {
                  cardName: cardData.name,
                  candidateName,
                });
              }
            }
          } catch {
            // Card lookup failed, proceed without context
          }
          break;
        }
      }
    }

    // 8. AI Translation (with tiered model selection)
    // Fetch dynamic rules in parallel with building context (non-blocking)
    const queryWordCount = query.trim().split(/\s+/).length;
    const isLikelyName =
      deterministicResult.intent.warnings.includes('likely_card_name');
    // Use medium tier for synergy queries since they need more reasoning
    const tier: QueryTier = cardSynergyContext
      ? 'medium'
      : queryWordCount > 8
        ? 'complex'
        : queryWordCount > 4
          ? 'medium'
          : 'simple';

    // Use stronger model for card name queries or synergy queries
    const aiModel =
      isLikelyName || cardSynergyContext
        ? 'google/gemini-2.5-flash'
        : tier === 'simple'
          ? 'google/gemini-2.5-flash-lite'
          : 'google/gemini-3-flash-preview';

    // Deterministic fallback guard: skip optional dynamic rules if remaining budget
    // drops below the stage floor derived from REQUEST_BUDGET_MS.
    if (!requestBudget.hasBudgetFor(REQUEST_STAGE_MIN_BUDGET_MS.dynamicRules)) {
      return buildBudgetExceededResponse('dynamic_rules', 0.57, [
        'Skipped dynamic rules fetch due to low remaining request budget',
      ]);
    }

    const dynamicRules = await fetchDynamicRules();
    if (!requestBudget.hasBudgetFor(1)) {
      logWarn('request_budget_exceeded_before_ai_translate');
      return createBudgetExceededResponse();
    }
    const systemPrompt = buildSystemPrompt(tier, dynamicRules, '');
    const cardNameHint = isLikelyName
      ? ' (IMPORTANT: This is likely a Magic: The Gathering card name, not a search description. Output ONLY the exact Scryfall name search like !"Gray Merchant of Asphodel" using the correct card name. Fix common misspellings: grey→gray, etc. If unsure of full name, use name: syntax like name:merchant.)'
      : '';
    const userMessage = `Translate to Scryfall search syntax: "${queryForAI}"${cardNameHint}${cardSynergyContext} ${deterministicQuery ? `(must include: ${deterministicQuery})` : ''}`;

    // Deterministic fallback guard: never start the AI call unless there is
    // enough time budget remaining for it to complete.
    if (!requestBudget.hasBudgetFor(REQUEST_STAGE_MIN_BUDGET_MS.aiCall)) {
      return buildBudgetExceededResponse('ai_call', 0.56, [
        'Skipped AI translation due to low remaining request budget',
      ]);
    }

    try {
      const aiResponse = await markStage('ai', () =>
        fetchWithRetry(
          'https://ai.gateway.lovable.dev/v1/chat/completions',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: aiModel,
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
              ],
              temperature: 0.1,
            }),
          },
          {
            timeoutMs: AI_FETCH_TIMEOUT_MS,
            retries: AI_MAX_RETRIES,
            deadlineMs: requestBudget.deadlineMs,
          },
        ),
      );

      if (!aiResponse.ok)
        throw new Error(`AI Gateway error: ${aiResponse.status}`);

      const aiData = await aiResponse.json();

      // Validate AI response structure
      const validatedResponse = validateAIResponse(aiData);
      const rawContent = extractAIContent(validatedResponse);

      // Parse AI response (expecting JSON-like block or raw scryfall)
      const parsedContent = parseAIContent(rawContent);
      const scryfallQuery = parsedContent.scryfallQuery;
      const explanationText =
        parsedContent.explanation || `Translated: ${query}`;
      const confidence = parsedContent.confidence || 0.75;

      // 8. Post-Processing & Validation
      const qualityFlags = detectQualityFlags(scryfallQuery);
      const { correctedQuery, corrections } = applyAutoCorrections(
        scryfallQuery,
        qualityFlags,
      );
      const validation = validateQuery(correctedQuery);

      const readableExplanation = detectedCardName
        ? `Finding cards that synergize with ${detectedCardName}`
        : explanationText;

      const finalResult = {
        scryfallQuery: validation.sanitized,
        explanation: {
          readable: readableExplanation,
          assumptions: detectedCardName
            ? [`Detected card: ${detectedCardName}`, ...corrections]
            : corrections,
          confidence: confidence,
        },
        showAffiliate: true,
      };

      // 9. Success Housekeeping
      recordCircuitSuccess();
      const responseTimeMs = Date.now() - requestStartTime;
      logInfo('request_completed', getPerfLogFields('ai', responseTimeMs));

      // Cache AI results more aggressively (>= 0.65 instead of 0.8) to prevent duplicate AI calls
      if (useCache && confidence >= 0.65) {
        setCachedResult(query, filters, finalResult, cacheSalt);
        setPersistentCache(query, filters, finalResult, cacheSalt);
      }

      // Auto-seed high-confidence AI translations into translation_rules for future pattern matches
      if (confidence >= 0.8 && validation.sanitized.length > 0) {
        runInBackground(
          seedTranslationRule(query, validation.sanitized, confidence),
        );
      }

      logTranslation(
        query,
        validation.sanitized,
        confidence,
        responseTimeMs,
        validation.issues,
        qualityFlags,
        filters,
        false,
        'ai',
        null,
        {
          preTranslationAttempted,
          preTranslationSkippedReason,
        },
      );
      logInfo('ai_translation_success', {
        responseTimeMs,
        preTranslationAttempted,
        preTranslationSkippedReason,
      });
      flushLogQueue(); // fire-and-forget

      return new Response(
        JSON.stringify({
          originalQuery: query,
          ...finalResult,
          ...(detectedCardName ? { detectedCardName } : {}),
          validationIssues: validation.issues,
          responseTimeMs: responseTimeMs,
          success: true,
          source: 'ai',
        }),
        { headers: jsonHeaders },
      );
    } catch (e) {
      if (!requestBudget.hasBudgetFor(1)) {
        logWarn('request_budget_exceeded_during_ai_translate');
        return createBudgetExceededResponse();
      }

      recordCircuitFailure();
      logWarn('ai_failure', { error: sanitizeError(e) });
      const fallback = await markStage('fallback', () =>
        Promise.resolve(buildFallbackQuery(query, filters)),
      );
      const responseTimeMs = Date.now() - requestStartTime;
      logInfo(
        'request_completed',
        getPerfLogFields('ai_failure_fallback', responseTimeMs),
      );
      return new Response(
        JSON.stringify({
          originalQuery: query,
          scryfallQuery: fallback.sanitized,
          explanation: {
            readable: `Searching for: ${query}`,
            assumptions: ['AI failed - using fallback'],
            confidence: 0.5,
          },
          responseTimeMs,
          success: true,
          fallback: true,
          source: 'ai_failure_fallback',
        }),
        { headers: jsonHeaders },
      );
    }
  } catch {
    // Errors are logged via structured logging in individual handlers
    const responseTimeMs = Date.now() - requestStartTime;
    logWarn(
      'request_completed',
      getPerfLogFields('internal_error', responseTimeMs),
    );
    return new Response(
      JSON.stringify({ error: 'Internal search error', success: false }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
