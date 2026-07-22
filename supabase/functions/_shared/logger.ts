/**
 * Shared structured logger for edge functions.
 *
 * Every log line is emitted as a single JSON payload so it is trivially
 * searchable in the edge function logs. Handlers wrapped with `withLogging`
 * get a consistent request id, start/complete/failed events, latency in ms,
 * an `x-request-id` response header, and actionable error output (message,
 * name, code, stack) even when the thrown value is not an Error instance.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface StructuredLogData {
  [key: string]: unknown;
}

declare const Deno: { env: { get(key: string): string | undefined } } | undefined;

const DEBUG_ENABLED = (() => {
  try {
    return (typeof Deno !== 'undefined' && Deno?.env.get('LOG_LEVEL') === 'debug') || false;
  } catch {
    return false;
  }
})();

function emit(level: LogLevel, payload: Record<string, unknown>): void {
  const serialized = JSON.stringify(payload);
  if (level === 'error') {
    console.error(serialized);
  } else if (level === 'warn') {
    console.warn(serialized);
  } else if (level === 'debug') {
    console.debug?.(serialized) ?? console.log(serialized);
  } else {
    console.log(serialized);
  }
}

export function logEvent(
  level: LogLevel,
  event: string,
  metadata: StructuredLogData = {},
): void {
  if (level === 'debug' && !DEBUG_ENABLED) return;
  emit(level, {
    level,
    event,
    timestamp: new Date().toISOString(),
    ...metadata,
  });
}

/**
 * Normalize any thrown value into a structured, log-safe object.
 * Preserves `name`, `code`, `message`, `stack`, and `cause` when present.
 */
export function formatError(err: unknown): StructuredLogData {
  if (err instanceof Error) {
    const out: StructuredLogData = {
      error_name: err.name,
      error_message: err.message,
    };
    if (err.stack) out.stack = err.stack.split('\n').slice(0, 12).join('\n');
    const anyErr = err as unknown as { code?: unknown; cause?: unknown; status?: unknown };
    if (anyErr.code !== undefined) out.error_code = String(anyErr.code);
    if (anyErr.status !== undefined) out.error_status = anyErr.status;
    if (anyErr.cause !== undefined) {
      const c = anyErr.cause;
      out.cause = c instanceof Error ? { name: c.name, message: c.message } : String(c);
    }
    return out;
  }
  if (err && typeof err === 'object') {
    const rec = err as Record<string, unknown>;
    return {
      error_message: String(rec.message ?? JSON.stringify(rec)),
      ...(rec.code !== undefined ? { error_code: String(rec.code) } : {}),
    };
  }
  return { error_message: err === undefined ? 'unknown_error' : String(err) };
}

function coerceMetadata(metadata: StructuredLogData | unknown): StructuredLogData {
  if (metadata instanceof Error) return formatError(metadata);
  if (!metadata || typeof metadata !== 'object') {
    return metadata !== undefined ? { detail: String(metadata) } : {};
  }
  return metadata as StructuredLogData;
}

export interface ScopedLogger {
  info: (event: string, metadata?: StructuredLogData) => void;
  warn: (event: string, metadata?: StructuredLogData) => void;
  error: (event: string, metadata?: StructuredLogData | unknown) => void;
  debug: (event: string, metadata?: StructuredLogData) => void;
  /** Returns a new logger that merges the given bindings into every emit. */
  child: (bindings: StructuredLogData) => ScopedLogger;
  /**
   * Start a timer. Call the returned function with an event name to emit an
   * `info` log including `durationMs`.
   */
  time: (label: string) => (extra?: StructuredLogData) => number;
}

function makeLogger(bindings: StructuredLogData): ScopedLogger {
  const emitWith = (level: LogLevel, event: string, metadata: StructuredLogData | unknown = {}) =>
    logEvent(level, event, { ...bindings, ...coerceMetadata(metadata) });
  return {
    info: (event, metadata = {}) => emitWith('info', event, metadata),
    warn: (event, metadata = {}) => emitWith('warn', event, metadata),
    error: (event, metadata) => emitWith('error', event, metadata),
    debug: (event, metadata = {}) => emitWith('debug', event, metadata),
    child: (extra) => makeLogger({ ...bindings, ...extra }),
    time: (label) => {
      const start = performance.now();
      return (extra: StructuredLogData = {}) => {
        const durationMs = Math.round(performance.now() - start);
        emitWith('info', `${label}_completed`, { durationMs, ...extra });
        return durationMs;
      };
    },
  };
}

export function createLogger(scope: string, bindings: StructuredLogData = {}): ScopedLogger {
  return makeLogger({ scope, ...bindings });
}

/** Generate a request id, honoring inbound `x-request-id` if provided. */
export function newRequestId(req?: Request): string {
  const inbound = req?.headers.get('x-request-id') || req?.headers.get('x-correlation-id');
  if (inbound && /^[\w.\-:]{6,128}$/.test(inbound)) return inbound;
  try {
    return crypto.randomUUID();
  } catch {
    return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  }
}

export interface RequestContext {
  log: ScopedLogger;
  requestId: string;
  startedAt: number;
}

export type LoggingHandler = (
  req: Request,
  ctx: RequestContext,
) => Promise<Response> | Response;

export interface WithLoggingOptions {
  /** Extra static bindings included on every log line (e.g. `{ region }`). */
  bindings?: StructuredLogData;
  /** Skip the request_started log line (useful for very high-volume paths). */
  quietStart?: boolean;
}

/**
 * Wrap an edge function handler so every request emits consistent
 * `request_started` / `request_completed` / `request_failed` logs and the
 * response carries an `x-request-id` header. Uncaught errors are captured
 * with full stack traces and returned as a structured 500.
 */
export function withLogging(
  scope: string,
  handler: LoggingHandler,
  options: WithLoggingOptions = {},
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    const requestId = newRequestId(req);
    const startedAt = performance.now();
    const url = (() => {
      try { return new URL(req.url); } catch { return null; }
    })();
    const log = createLogger(scope, {
      requestId,
      method: req.method,
      path: url?.pathname,
      ...(options.bindings ?? {}),
    });

    if (!options.quietStart && req.method !== 'OPTIONS') {
      log.info('request_started');
    }

    try {
      const res = await handler(req, { log, requestId, startedAt });
      const durationMs = Math.round(performance.now() - startedAt);
      if (req.method !== 'OPTIONS') {
        const level: LogLevel = res.status >= 500 ? 'error' : res.status >= 400 ? 'warn' : 'info';
        logEvent(level, 'request_completed', {
          scope,
          requestId,
          status: res.status,
          durationMs,
        });
      }
      // Ensure x-request-id is exposed on every response.
      const headers = new Headers(res.headers);
      if (!headers.has('x-request-id')) headers.set('x-request-id', requestId);
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    } catch (err) {
      const durationMs = Math.round(performance.now() - startedAt);
      log.error('request_failed', { durationMs, ...formatError(err) });
      return new Response(
        JSON.stringify({ error: 'Internal error', requestId }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'x-request-id': requestId,
          },
        },
      );
    }
  };
}
