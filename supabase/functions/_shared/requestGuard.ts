/**
 * Shared request guard for AI edge functions.
 * Handles CORS preflight, auth validation, rate limiting, and API key check
 * in a single call — eliminating ~25 lines of boilerplate per function.
 */

import { validateAuth, getCorsHeaders } from './auth.ts';
import { checkRateLimit, maybeCleanup } from './rateLimit.ts';

declare const Deno: {
  env: { get(key: string): string | undefined };
};

export interface GuardOptions {
  /** Max requests per IP per window. Default: 10 */
  rateLimit?: number;
  /** Global rate limit. Default: 200 */
  globalLimit?: number;
  /** Require a specific HTTP method (e.g. 'POST'). Omit to allow any. */
  method?: string;
  /** Whether to require LOVABLE_API_KEY. Default: true */
  requireAIKey?: boolean;
}

export interface GuardContext {
  corsHeaders: Record<string, string>;
  headers: Record<string, string>;
  apiKey: string;
}

type GuardResult =
  | { ok: true; ctx: GuardContext }
  | { ok: false; response: Response };

/**
 * Runs all standard pre-handler checks. Returns either a ready-to-return
 * error Response or a context object with CORS headers and the AI API key.
 */
export async function runRequestGuard(
  req: Request,
  options: GuardOptions = {},
): Promise<GuardResult> {
  const {
    rateLimit: ipLimit = 10,
    globalLimit = 200,
    method,
    requireAIKey = true,
  } = options;

  const corsHeaders = getCorsHeaders(req);
  const headers = { ...corsHeaders, 'Content-Type': 'application/json' };

  // 1. CORS preflight
  if (req.method === 'OPTIONS') {
    return { ok: false, response: new Response(null, { headers: corsHeaders }) };
  }

  // 2. Method check
  if (method && req.method !== method) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers },
      ),
    };
  }

  // 3. Auth
  const authResult = await validateAuth(req);
  if (!authResult.authorized) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: authResult.error || 'Unauthorized' }),
        { status: 401, headers },
      ),
    };
  }

  // 4. Rate limiting
  maybeCleanup();
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const { allowed, retryAfter } = await checkRateLimit(
    clientIp,
    undefined,
    ipLimit,
    globalLimit,
  );
  if (!allowed) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({
          error: 'Too many requests. Please slow down.',
          retryAfter,
        }),
        {
          status: 429,
          headers: { ...headers, 'Retry-After': String(retryAfter) },
        },
      ),
    };
  }

  // 5. AI key check
  const apiKey = Deno.env.get('LOVABLE_API_KEY') ?? '';
  if (requireAIKey && !apiKey) {
    return {
      ok: false,
      response: new Response(
        JSON.stringify({ error: 'AI not configured' }),
        { status: 500, headers },
      ),
    };
  }

  return { ok: true, ctx: { corsHeaders, headers, apiKey } };
}
