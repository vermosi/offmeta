import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { buildDeterministicIntent } from './deterministic/index.ts';
import { buildSystemPrompt, type QueryTier } from './prompts.ts';
import { checkRateLimit, checkSessionRateLimit } from '../_shared/rateLimit.ts';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { LOVABLE_API_KEY, supabase } from './client.ts';
import {
  getCachedResult,
  setCachedResult,
  getPersistentCache,
  setPersistentCache,
  maybeCacheCleanup,
} from './cache.ts';
import { fetchWithRetry } from './utils.ts';
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
  const operatorTokens = tokens.filter(t => /^-?[a-zA-Z]+[:=<>]/.test(t));

  // If most tokens are operator-based, it's raw syntax
  if (operatorTokens.length === 0) return false;

  // Check that the operators are valid Scryfall keys
  for (const token of operatorTokens) {
    const keyMatch = token.match(/^-?([a-zA-Z]+)[:=<>]/);
    if (keyMatch) {
      const key = keyMatch[1].toLowerCase();
      if (!VALID_SEARCH_KEYS.has(key) && !['kw', 'otag', 'atag', 'in', 'is', 'not', 'has', 'set', 'cn', 'year', 'game', 'banned', 'restricted', 'unique', 'order', 'direction', 'prefer', 'prints', 'new', 'cheapest', 'usd', 'eur', 'tix', 'border', 'frame', 'stamp', 'watermark', 'art', 'flavor', 'lore', 'include', 'language', 'date', 'mana', 'wildpair'].includes(key)) {
        return false; // Contains invalid operator
      }
    }
  }

  // Non-operator words should be minimal (allow OR, AND, NOT, parens, quotes)
  const nonOperatorTokens = tokens.filter(t =>
    !(/^-?[a-zA-Z]+[:=<>]/.test(t)) &&
    !['or', 'and', 'not', '-'].includes(t.toLowerCase()) &&
    !t.startsWith('(') && !t.startsWith(')') &&
    !t.startsWith('"')
  );

  // If more than 30% of tokens are natural language, it's not raw syntax
  return nonOperatorTokens.length <= tokens.length * 0.3;
}

/**
 * Auto-seed high-confidence AI translations into translation_rules
 * so future identical queries hit the pattern match layer instead of AI.
 */
async function seedTranslationRule(query: string, scryfallQuery: string, confidence: number): Promise<void> {
  try {
    const normalized = query.toLowerCase().trim().replace(/\s+/g, ' ');
    // Don't seed very short or very long queries
    if (normalized.length < 5 || normalized.length > 200) return;

    await supabase.from('translation_rules').upsert(
      {
        pattern: normalized,
        scryfall_syntax: scryfallQuery,
        confidence,
        description: `Auto-seeded from AI translation`,
        is_active: true,
      },
      { onConflict: 'pattern' }
    );
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

// Helper function for consistent error responses
function errorResponse(
  message: string,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ error: message, success: false }), {
    status,
    headers,
  });
}

// Sanitize error messages to prevent sensitive data leakage
function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    // Remove file paths and sensitive details
    return error.message.replace(/\/[^\s]+/g, '[PATH]');
  }
  return 'Unknown error';
}

/**
 * Main Edge Function Handler
 */
serve(async (req) => {
  // Trigger periodic in-memory cache cleanup (serverless-safe)
  maybeCacheCleanup();

  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
    return new Response(null, {
      headers: { ...corsHeaders, 'x-request-id': requestId },
    });
  }

  const requestStartTime = Date.now();
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const { logInfo, logWarn } = createLogger(requestId);

  const jsonHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'x-request-id': requestId,
  };

  // Authentication check
  const authResult = validateAuth(req);
  if (!authResult.authorized) {
    logWarn('auth_failed', { error: authResult.error });
    return errorResponse(authResult.error || 'Unauthorized', 401, jsonHeaders);
  }

  // Rate limiting check - both IP and session-based
  const clientIP =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const sessionId = req.headers.get('x-session-id');

  // Check IP-based rate limit (in-memory only — skip DB RPC which doesn't exist)
  const rateCheck = await checkRateLimit(clientIP);
  if (!rateCheck.allowed) {
    logWarn('rate_limit_exceeded', {
      ip: clientIP.substring(0, 20),
      retryAfter: rateCheck.retryAfter,
    });

    return new Response(
      JSON.stringify({
        error: 'Too many requests. Please slow down.',
        retryAfter: rateCheck.retryAfter,
        success: false,
      }),
      {
        status: 429,
        headers: {
          ...jsonHeaders,
          'Retry-After': String(rateCheck.retryAfter),
        },
      },
    );
  }

  // Check session-based rate limit (stricter - 20/min per session)
  const sessionCheck = checkSessionRateLimit(sessionId);
  if (!sessionCheck.allowed) {
    logWarn('session_rate_limit_exceeded', {
      sessionId: sessionId?.substring(0, 20),
      retryAfter: sessionCheck.retryAfter,
    });

    return new Response(
      JSON.stringify({
        error:
          'Session rate limit exceeded. Please wait before searching again.',
        retryAfter: sessionCheck.retryAfter,
        success: false,
      }),
      {
        status: 429,
        headers: {
          ...jsonHeaders,
          'Retry-After': String(sessionCheck.retryAfter),
        },
      },
    );
  }

  // Parse request body with proper error handling
  let requestBody;
  try {
    requestBody = await req.json();
  } catch (e) {
    logWarn('invalid_json', { error: sanitizeError(e) });
    return errorResponse('Invalid JSON in request body', 400, jsonHeaders);
  }

  try {
    const { query, filters, debug, useCache, cacheSalt } = requestBody;

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
      const fallbackResult = buildFallbackQuery(query, filters);
      const responseTimeMs = Date.now() - requestStartTime;

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

    // 2.5. New Pipeline Mode (opt-in via debug flag)
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
      Promise.resolve(buildDeterministicIntent(query)),
      useCache
        ? Promise.all([
            getCachedResult(query, filters, cacheSalt),
            getPersistentCache(query, filters, cacheSalt),
          ]).then(([mem, persistent]) => mem || persistent)
        : Promise.resolve(null),
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
        logTranslation(query, cached.scryfallQuery, cached.explanation?.confidence ?? 0.9, responseTimeMs, [], [], filters, false, 'cache');
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
    const patternMatch = await checkPatternMatch(query, filters);
    if (patternMatch) {
      const responseTimeMs = Date.now() - requestStartTime;
      logInfo('pattern_match_hit', {
        query: query.substring(0, 50),
        responseTimeMs,
      });

      setCachedResult(query, filters, patternMatch, cacheSalt);
      logTranslation(query, patternMatch.scryfallQuery, patternMatch.explanation?.confidence ?? 0.85, responseTimeMs, [], [], filters, false, 'pattern_match');
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
      const fallback = buildFallbackQuery(query, filters);
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
      logInfo('raw_syntax_passthrough', { query: trimmedQuery.substring(0, 50), responseTimeMs });
      logTranslation(query, validation.sanitized, 0.95, responseTimeMs, [], [], filters, false, 'raw_syntax');
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

    // 6b. Deterministic Result check (can we skip AI?)
    // Skip Scryfall network validation — deterministic results are pre-validated, validation adds latency.
    if (deterministicQuery && !deterministicResult.intent.remainingQuery) {
      const validation = validateQuery(deterministicQuery || query);
      const responseTimeMs = Date.now() - requestStartTime;
      logTranslation(query, validation.sanitized, 0.9, responseTimeMs, [], [], filters, false, 'deterministic');
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

    // 7. Pre-translate non-English queries to English for better AI accuracy
    const remainingQuery = deterministicResult.intent.remainingQuery || '';
    let queryForAI = remainingQuery;

    // Detect non-Latin scripts or common non-English patterns
    const hasNonLatin = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}\p{Script=Devanagari}]/u.test(remainingQuery);
    const hasAccentedLatin = /[àáâãäåæçèéêëìíîïðñòóôõöùúûüýþÿ]/i.test(remainingQuery);
    const looksNonEnglish = hasNonLatin || (hasAccentedLatin && !/^[a-zA-Z0-9\s\-:=<>!'"()+/*.,;$]+$/.test(remainingQuery));

    if (looksNonEnglish && remainingQuery.trim().length > 0) {
      try {
        const preTranslateResponse = await fetchWithRetry(
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
                  content: 'You are a translator. Translate the following Magic: The Gathering card search query into English. Preserve all MTG-specific intent (counter, destroy, exile, ramp, etc.). Output ONLY the English translation, nothing else.',
                },
                { role: 'user', content: remainingQuery },
              ],
              temperature: 0.0,
            }),
          },
        );

        if (preTranslateResponse.ok) {
          const preTranslateData = await preTranslateResponse.json();
          const translated = preTranslateData?.choices?.[0]?.message?.content?.trim();
          if (translated && translated.length > 0) {
            logInfo(`Pre-translated: "${remainingQuery}" → "${translated}"`);
            queryForAI = translated;
          }
        }
      } catch (e) {
        // Pre-translation failed, proceed with original query
        logWarn(`Pre-translation failed, using original: ${e}`);
      }
    }

    // 8. AI Translation (with tiered model selection)
    // Fetch dynamic rules in parallel with building context (non-blocking)
    const queryWords = query.trim().split(/\s+/).length;
    const isLikelyName = deterministicResult.intent.warnings.includes('likely_card_name');
    const tier: QueryTier =
      queryWords > 8 ? 'complex' : queryWords > 4 ? 'medium' : 'simple';

    // Use stronger model for card name queries (needs MTG knowledge for fuzzy matching)
    const aiModel = isLikelyName
      ? 'google/gemini-2.5-flash'
      : tier === 'simple'
        ? 'google/gemini-2.5-flash-lite'
        : 'google/gemini-3-flash-preview';

    const dynamicRules = await fetchDynamicRules();
    const systemPrompt = buildSystemPrompt(tier, dynamicRules, '');
    const cardNameHint = isLikelyName
      ? ' (IMPORTANT: This is likely a Magic: The Gathering card name, not a search description. Output ONLY the exact Scryfall name search like !"Gray Merchant of Asphodel" using the correct card name. Fix common misspellings: grey→gray, etc. If unsure of full name, use name: syntax like name:merchant.)'
      : '';
    const userMessage = `Translate to Scryfall search syntax: "${queryForAI}"${cardNameHint} ${deterministicQuery ? `(must include: ${deterministicQuery})` : ''}`;

    try {
      const aiResponse = await fetchWithRetry(
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

      const finalResult = {
        scryfallQuery: validation.sanitized,
        explanation: {
          readable: explanationText,
          assumptions: corrections,
          confidence: confidence,
        },
        showAffiliate: true,
      };

      // 9. Success Housekeeping
      recordCircuitSuccess();
      const responseTimeMs = Date.now() - requestStartTime;

      // Cache AI results more aggressively (>= 0.65 instead of 0.8) to prevent duplicate AI calls
      if (useCache && confidence >= 0.65) {
        setCachedResult(query, filters, finalResult, cacheSalt);
        setPersistentCache(query, filters, finalResult, cacheSalt);
      }

      // Auto-seed high-confidence AI translations into translation_rules for future pattern matches
      if (confidence >= 0.8 && validation.sanitized.length > 0) {
        seedTranslationRule(query, validation.sanitized, confidence).catch(() => {});
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
      );
      flushLogQueue(); // fire-and-forget

      return new Response(
        JSON.stringify({
          originalQuery: query,
          ...finalResult,
          validationIssues: validation.issues,
          responseTimeMs: responseTimeMs,
          success: true,
          source: 'ai',
        }),
        { headers: jsonHeaders },
      );
    } catch (e) {
      recordCircuitFailure();
      logWarn('ai_failure', { error: sanitizeError(e) });
      const fallback = buildFallbackQuery(query, filters);
      return new Response(
        JSON.stringify({
          originalQuery: query,
          scryfallQuery: fallback.sanitized,
          explanation: {
            readable: `Searching for: ${query}`,
            assumptions: ['AI failed - using fallback'],
            confidence: 0.5,
          },
          success: true,
          fallback: true,
          source: 'ai_failure_fallback',
        }),
        { headers: jsonHeaders },
      );
    }
  } catch {
    // Errors are logged via structured logging in individual handlers
    return new Response(
      JSON.stringify({ error: 'Internal search error', success: false }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
