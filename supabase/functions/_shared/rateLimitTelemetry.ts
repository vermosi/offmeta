/**
 * Telemetry for rate-limited edge function requests.
 *
 * Emits a structured `rate_limit_rejected` log line for every throttled call
 * (so 429s are searchable in the edge function logs), keeps per-scope counters
 * for the lifetime of the isolate, and best-effort records an
 * `edge_rate_limited` analytics event so 429 trends are queryable in the DB.
 */

import { createLogger, type StructuredLogData } from './logger.ts';
import type { RateLimitBackend, RateLimitReason } from './rateLimit.ts';

declare const Deno:
  | { env: { get(key: string): string | undefined } }
  | undefined;

export interface RateLimitRejection {
  statusCode?: 429 | 503;
  retryAfter?: number;
  reason?: RateLimitReason;
  backend?: RateLimitBackend;
  limit?: number;
}

export interface RateLimitMetric {
  scope: string;
  reason: RateLimitReason;
  count: number;
  lastAt: string;
}

const counters = new Map<string, RateLimitMetric>();

/** Snapshot of 429/503 counters for this isolate (used by tests and probes). */
export function getRateLimitMetrics(): RateLimitMetric[] {
  return Array.from(counters.values()).map((metric) => ({ ...metric }));
}

/** Reset counters (tests only). */
export function resetRateLimitMetrics(): void {
  counters.clear();
}

function bump(scope: string, reason: RateLimitReason): number {
  const key = `${scope}:${reason}`;
  const existing = counters.get(key);
  const next: RateLimitMetric = {
    scope,
    reason,
    count: (existing?.count ?? 0) + 1,
    lastAt: new Date().toISOString(),
  };
  counters.set(key, next);
  return next.count;
}

/** Hashed-safe short identifier for the throttled caller bucket. */
function shortBucket(bucketKey: string): string {
  const [prefix, value = ''] = bucketKey.split(':');
  return `${prefix}:${value.slice(0, 8)}`;
}

async function recordAnalytics(payload: StructuredLogData): Promise<void> {
  try {
    if (typeof Deno === 'undefined') return;
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return;

    await fetch(`${url}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type: 'edge_rate_limited',
        event_data: payload,
      }),
    });
  } catch {
    // Telemetry must never break the response path.
  }
}

/**
 * Log + count a throttled request and build the client response.
 * Always include the returned headers so clients can honor `Retry-After`.
 */
export function rateLimitedResponse(
  scope: string,
  req: Request,
  bucketKey: string,
  rejection: RateLimitRejection,
  extraHeaders: Record<string, string> = {},
  context: StructuredLogData = {},
): Response {
  const status = rejection.statusCode ?? 429;
  const reason: RateLimitReason = rejection.reason ?? 'bucket_limit';
  const retryAfter = Math.max(1, Math.ceil(rejection.retryAfter ?? 1));
  const occurrences = bump(scope, reason);

  const requestId =
    req.headers.get('x-request-id') ?? req.headers.get('x-correlation-id');
  const details: StructuredLogData = {
    scope,
    status,
    reason,
    backend: rejection.backend ?? 'memory',
    limit: rejection.limit,
    retryAfter,
    bucket: shortBucket(bucketKey),
    occurrences,
    path: (() => {
      try {
        return new URL(req.url).pathname;
      } catch {
        return undefined;
      }
    })(),
    method: req.method,
    ...(requestId ? { requestId } : {}),
    ...context,
  };

  createLogger(scope).warn('rate_limit_rejected', details);
  void recordAnalytics(details);

  return new Response(
    JSON.stringify({
      error:
        status === 503
          ? 'Rate limiter unavailable. Please retry shortly.'
          : 'Too many requests. Please slow down.',
      reason,
      retryAfter,
    }),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
        'X-RateLimit-Reason': reason,
        ...extraHeaders,
      },
    },
  );
}
