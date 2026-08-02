import { rateLimitedResponse } from '../../_shared/rateLimitTelemetry.ts';
import {
  checkRateLimit,
  checkSessionRateLimit,
  resolveRateLimitKey,
} from '../../_shared/rateLimit.ts';
import { validateAuth, logAuthFailure } from '../../_shared/auth.ts';


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
    await logAuthFailure(req, authResult.error || 'Unauthorized', 'semantic-search');
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
    return rateLimitedResponse(
      'semantic-search',
      req,
      rateLimitKey,
      rateCheck,
      jsonHeaders,
      { hasSession: Boolean(sessionId) },
    );
  }

  const sessionCheck = checkSessionRateLimit(sessionId);
  if (!sessionCheck.allowed) {
    return rateLimitedResponse(
      'semantic-search',
      req,
      `session:${sessionId ?? 'unknown'}`,
      {
        statusCode: 429,
        retryAfter: sessionCheck.retryAfter,
        reason: 'session_limit',
        backend: 'memory',
      },
      jsonHeaders,
    );
  }

  return null;
}

export async function parseJsonBody(
  req: Request,
  jsonHeaders: Record<string, string>,
  logWarn: (event: string, payload: Record<string, unknown>) => void,
): Promise<{ requestBody: Record<string, unknown> } | { response: Response }> {
  // Guard against oversized POST bodies. sanitizeInputQuery caps the query
  // string internally, but without this check a multi-MB body is fully read
  // into memory before parsing. 64 KB is far more than any legitimate search.
  const MAX_BODY_BYTES = 64 * 1024;
  const contentLengthHeader = req.headers.get('content-length');
  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);
    if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
      logWarn('body_too_large', { contentLength });
      return {
        response: errorResponse('Request body too large', 413, jsonHeaders),
      };
    }
  }

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
