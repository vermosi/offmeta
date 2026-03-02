import {
  checkRateLimit,
  checkSessionRateLimit,
  resolveRateLimitKey,
} from '../../_shared/rateLimit.ts';
import { validateAuth } from '../../_shared/auth.ts';

export interface RequestBudget {
  deadlineMs: number;
  remainingMs: () => number;
  hasBudgetFor: (minimumMs: number) => boolean;
}

export function errorResponse(
  message: string,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ error: message, success: false }), {
    status,
    headers,
  });
}

export function sanitizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message.replace(/\/[^\s]+/g, '[PATH]');
  }
  return 'Unknown error';
}

export function parseRequestBudget(
  req: Request,
  requestStartTime: number,
  requestBudgetMs: number,
): RequestBudget {
  const requestStartHeader = Number(req.headers.get('x-request-start'));
  const deadlineHeader = Number(req.headers.get('x-deadline-ms'));

  const effectiveStart =
    Number.isFinite(requestStartHeader) && requestStartHeader > 0
      ? requestStartHeader
      : requestStartTime;

  const effectiveDeadline =
    Number.isFinite(deadlineHeader) && deadlineHeader > effectiveStart
      ? deadlineHeader
      : effectiveStart + requestBudgetMs;

  return {
    deadlineMs: effectiveDeadline,
    remainingMs: () => Math.max(0, effectiveDeadline - Date.now()),
    hasBudgetFor: (minimumMs: number) =>
      effectiveDeadline - Date.now() >= minimumMs,
  };
}

export function handleCorsPreflight(
  req: Request,
  corsHeaders: Record<string, string>,
): Response | null {
  if (req.method !== 'OPTIONS') {
    return null;
  }

  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  return new Response(null, {
    headers: { ...corsHeaders, 'x-request-id': requestId },
  });
}

export async function enforceRequestGuards(
  req: Request,
  jsonHeaders: Record<string, string>,
  logWarn: (event: string, payload: Record<string, unknown>) => void,
): Promise<Response | null> {
  const authResult = await validateAuth(req);
  if (!authResult.authorized) {
    logWarn('auth_failed', { error: authResult.error });
    return errorResponse(authResult.error || 'Unauthorized', 401, jsonHeaders);
  }

  const rateLimitKey = await resolveRateLimitKey(req);
  const sessionId = req.headers.get('x-session-id');

  const rateCheck = await checkRateLimit(
    rateLimitKey,
    undefined,
    30,
    1000,
    60000,
    { failOpen: false },
  );
  if (!rateCheck.allowed) {
    const status = rateCheck.statusCode ?? 429;
    const retryAfter = rateCheck.retryAfter ?? 1;

    logWarn('rate_limit_exceeded', {
      bucket: rateLimitKey.slice(0, 20),
      retryAfter,
      status,
    });

    return new Response(
      JSON.stringify({
        error:
          status === 503
            ? 'Service temporarily unavailable. Please retry shortly.'
            : 'Too many requests. Please slow down.',
        retryAfter,
        success: false,
      }),
      {
        status,
        headers: {
          ...jsonHeaders,
          'Retry-After': String(retryAfter),
        },
      },
    );
  }

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

  return null;
}

export async function parseJsonBody(
  req: Request,
  jsonHeaders: Record<string, string>,
  logWarn: (event: string, payload: Record<string, unknown>) => void,
): Promise<{ requestBody: Record<string, unknown> } | { response: Response }> {
  try {
    const requestBody = (await req.json()) as Record<string, unknown>;
    return { requestBody };
  } catch (error) {
    logWarn('invalid_json', { error: sanitizeError(error) });
    return {
      response: errorResponse('Invalid JSON in request body', 400, jsonHeaders),
    };
  }
}
