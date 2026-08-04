/**
 * Client-side error reporting.
 *
 * Sends page-level failures to public.error_events through the
 * `report_error_event` RPC (anon-callable, write-only, deduplicated by
 * fingerprint server-side). Reporting is best-effort and silently no-ops on
 * failure so monitoring can never surface an error of its own.
 *
 * @module lib/monitoring/reportError
 */

import { supabase } from '@/integrations/supabase/client';

export type ClientErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface ClientErrorReport {
  errorType: string;
  message: string;
  severity?: ClientErrorSeverity;
  context?: Record<string, unknown>;
}

/** Max reports per session — prevents an error loop from flooding the table. */
const MAX_REPORTS_PER_SESSION = 20;
/** Ignore repeats of the same fingerprint within this window. */
const DEDUPE_WINDOW_MS = 60_000;

const recentlyReported = new Map<string, number>();
let reportCount = 0;

function shouldReport(key: string): boolean {
  if (reportCount >= MAX_REPORTS_PER_SESSION) return false;
  const last = recentlyReported.get(key);
  const now = Date.now();
  if (last && now - last < DEDUPE_WINDOW_MS) return false;
  recentlyReported.set(key, now);
  reportCount += 1;
  return true;
}

/** Strip query strings and hashes so URLs group cleanly. */
function currentPath(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

export async function reportClientError({
  errorType,
  message,
  severity = 'error',
  context = {},
}: ClientErrorReport): Promise<void> {
  const trimmed = (message ?? '').toString().trim();
  if (!trimmed) return;

  const key = `${errorType}|${trimmed.slice(0, 200)}|${currentPath()}`;
  if (!shouldReport(key)) return;

  try {
    await supabase.rpc('report_error_event', {
      p_source: 'client',
      p_error_type: errorType,
      p_message: trimmed.slice(0, 2000),
      p_url: currentPath(),
      p_severity: severity,
      p_context: {
        ...context,
        user_agent:
          typeof navigator !== 'undefined'
            ? navigator.userAgent.slice(0, 300)
            : undefined,
        referrer:
          typeof document !== 'undefined'
            ? document.referrer.slice(0, 300)
            : undefined,
      },
    });
  } catch {
    // Monitoring must never throw into app code.
  }
}

/** Classify a raw runtime error message into a stable error_type. */
export function classifyClientError(message: string): string {
  if (
    /dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
      message,
    )
  ) {
    return 'chunk_load_failed';
  }
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return 'network_failure';
  }
  if (/scryfall/i.test(message)) return 'scryfall_request_failed';
  if (/supabase|edge function/i.test(message)) return 'backend_request_failed';
  return 'unhandled_exception';
}

/**
 * Install global handlers for uncaught errors and unhandled promise
 * rejections. Safe to call once at app startup.
 */
export function initErrorMonitoring(): void {
  if (typeof window === 'undefined') return;

  window.addEventListener('error', (event) => {
    const message = String(event.error?.message ?? event.message ?? '');
    if (!message) return;
    void reportClientError({
      errorType: classifyClientError(message),
      message,
      context: {
        stack: String(event.error?.stack ?? '').slice(0, 1500),
        filename: event.filename,
      },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: string; stack?: string } | string;
    const message =
      typeof reason === 'string' ? reason : String(reason?.message ?? reason ?? '');
    if (!message) return;
    void reportClientError({
      errorType: classifyClientError(message),
      message,
      context: {
        stack:
          typeof reason === 'object'
            ? String(reason?.stack ?? '').slice(0, 1500)
            : undefined,
        kind: 'unhandledrejection',
      },
    });
  });
}
