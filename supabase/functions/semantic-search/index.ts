import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { buildDeterministicIntent } from './deterministic.ts';
import { buildSystemPrompt, type QueryTier } from './prompts.ts';
import { checkRateLimit } from '../_shared/rateLimit.ts';
import { getCorsHeaders, validateAuth } from '../_shared/auth.ts';
import { LOVABLE_API_KEY, supabase } from './client.ts';
import {
  getCachedResult,
  setCachedResult,
  getPersistentCache,
  setPersistentCache,
} from './cache.ts';
import { fetchWithRetry } from './utils.ts';
import {
  isCircuitOpen,
  recordCircuitFailure,
  recordCircuitSuccess,
} from './circuit-breaker.ts';
import { checkPatternMatch } from './matching.ts';
import { fetchDynamicRules } from './rules.ts';
import { validateAndRelaxQuery } from './scryfall.ts';
import { DEFAULT_OVERLY_BROAD_THRESHOLD } from './constants.ts';
import {
  validateQuery,
  detectQualityFlags,
  applyAutoCorrections,
  runValidationTables,
} from './validation.ts';
import { buildFallbackQuery, applyFiltersToQuery } from './fallback.ts';
import { logTranslation, createLogger } from './logging.ts';

// Run self-checks on startup if enabled
if (Deno.env.get('RUN_QUERY_VALIDATION_CHECKS') === 'true') {
  runValidationTables();
}

// Type definitions
interface DebugOptions {
  forceFallback?: boolean;
  simulateAiFailure?: boolean;
  overlyBroadThreshold?: number;
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

  // Rate limiting check
  const clientIP =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown';
  const rateCheck = await checkRateLimit(clientIP, supabase);

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

    // 3. Cache Lookups (In-Memory then Persistent)
    const deterministicResult = buildDeterministicIntent(query);
    const deterministicQuery = applyFiltersToQuery(
      deterministicResult.deterministicQuery,
      filters,
    );

    if (useCache) {
      const cached =
        (await getCachedResult(query, filters, cacheSalt)) ||
        (await getPersistentCache(query, filters, cacheSalt));

      if (cached) {
        const responseTimeMs = Date.now() - requestStartTime;
        logInfo('cache_hit', { query: query.substring(0, 50), responseTimeMs });

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

    // 6. Deterministic Result check (can we skip AI?)
    if (!deterministicResult.intent.remainingQuery) {
      const validation = validateQuery(deterministicQuery || query);
      const scryfallValidation = await validateAndRelaxQuery(
        validation.sanitized,
        deterministicQuery || null,
        overlyBroadThreshold,
      );

      return new Response(
        JSON.stringify({
          originalQuery: query,
          scryfallQuery: scryfallValidation.query,
          explanation: {
            readable: `Searching for: ${query}`,
            assumptions: [
              ...deterministicResult.intent.warnings,
              ...scryfallValidation.relaxedClauses,
            ],
            confidence: 0.9,
          },
          success: true,
          source: 'deterministic',
        }),
        { headers: jsonHeaders },
      );
    }

    // 7. AI Translation
    const dynamicRules = await fetchDynamicRules();
    const queryWords = query.trim().split(/\s+/).length;
    const tier: QueryTier =
      queryWords > 8 ? 'complex' : queryWords > 4 ? 'medium' : 'simple';

    const systemPrompt = buildSystemPrompt(tier, dynamicRules, ''); // Simplified context for now
    const userMessage = `Translate to Scryfall syntax: "${deterministicResult.intent.remainingQuery}" ${deterministicQuery ? `(must include: ${deterministicQuery})` : ''}`;

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
            model: 'google/gemini-2.0-flash-exp', // Use latest Gemini
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
      const rawContent = aiData.choices[0].message.content;

      // Parse AI response (expecting JSON-like block or raw scryfall)
      let scryfallQuery = rawContent.trim();
      let explanationText = `Translated: ${query}`;
      let confidence = 0.7;

      // Extract from markdown if needed
      if (scryfallQuery.includes('```')) {
        const match = scryfallQuery.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            scryfallQuery = parsed.scryfallQuery || scryfallQuery;
            explanationText = parsed.explanation || explanationText;
            confidence = parsed.confidence || confidence;
          } catch {
            scryfallQuery = match[1].trim();
          }
        }
      }

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

      if (useCache && confidence >= 0.8) {
        setCachedResult(query, filters, finalResult, cacheSalt);
        setPersistentCache(query, filters, finalResult, cacheSalt);
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
  } catch (e) {
    console.error('Unhandled Search Error:', e);
    return new Response(
      JSON.stringify({ error: 'Internal search error', success: false }),
      { status: 500, headers: jsonHeaders },
    );
  }
});
