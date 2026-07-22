/**
 * Lightweight in-app diagnostics for search compilation & Similar tab.
 *
 * Records structured events into a bounded ring buffer so failures can be
 * inspected without shipping every user event to an external sink. Events
 * are also mirrored to the shared logger (warn/error only) so they land in
 * the browser console during development and in Sentry-style relays if one
 * is later wired up. Exposes `window.__offmetaSearchDiagnostics` in the
 * browser so admins can `copy(window.__offmetaSearchDiagnostics.recent())`
 * straight from DevTools.
 */

import { logger } from '@/lib/core/logger';

export type SearchDiagnosticEvent =
  | {
      type: 'strategy_hate_compile';
      query: string;
      matched: string[];
      compiledQuery: string;
      timestamp: number;
    }
  | {
      type: 'similar_tab_error';
      query: string;
      fallbackCardId: string | null;
      reason: string;
      detail?: unknown;
      timestamp: number;
    }
  | {
      type: 'similar_tab_no_source';
      query: string;
      timestamp: number;
    };

const RING_SIZE = 50;
const ring: SearchDiagnosticEvent[] = [];

function push(event: SearchDiagnosticEvent): void {
  ring.push(event);
  if (ring.length > RING_SIZE) ring.shift();
}

export function recordStrategyHate(
  query: string,
  matched: string[],
  compiledQuery: string,
): void {
  if (matched.length === 0) return; // Only record actual hits
  const event: SearchDiagnosticEvent = {
    type: 'strategy_hate_compile',
    query,
    matched,
    compiledQuery,
    timestamp: Date.now(),
  };
  push(event);
  logger.debug('[search-diagnostics] strategy hate compiled', event);
}

/**
 * User-facing message for a Similar tab failure. Kept short and actionable —
 * the detailed reason lives in the diagnostics ring for later inspection.
 */
export function friendlySimilarErrorMessage(reason: string): string {
  if (/timeout|timed out|aborted/i.test(reason)) {
    return "Similar cards took too long to load. Please try again.";
  }
  if (/network|fetch|failed to fetch/i.test(reason)) {
    return "Couldn't reach the similarity service. Check your connection and retry.";
  }
  if (/not.*found|no.*source|no.*card/i.test(reason)) {
    return "We couldn't identify a card to compare against. Try a card name.";
  }
  return "Similar cards are temporarily unavailable. Please try again shortly.";
}

export function recordSimilarError(
  query: string,
  fallbackCardId: string | null,
  reason: string,
  detail?: unknown,
): void {
  const event: SearchDiagnosticEvent = {
    type: 'similar_tab_error',
    query,
    fallbackCardId,
    reason,
    detail,
    timestamp: Date.now(),
  };
  push(event);
  logger.warn('[search-diagnostics] similar tab failure', {
    query,
    fallbackCardId,
    reason,
  });
}

export function recordSimilarNoSource(query: string): void {
  const event: SearchDiagnosticEvent = {
    type: 'similar_tab_no_source',
    query,
    timestamp: Date.now(),
  };
  push(event);
  logger.debug('[search-diagnostics] similar tab: no source card', event);
}

export function recentDiagnostics(): SearchDiagnosticEvent[] {
  return [...ring];
}

export function clearDiagnostics(): void {
  ring.length = 0;
}

// Expose to DevTools for one-line inspection.
if (typeof window !== 'undefined') {
  (window as unknown as {
    __offmetaSearchDiagnostics?: {
      recent: () => SearchDiagnosticEvent[];
      clear: () => void;
    };
  }).__offmetaSearchDiagnostics = {
    recent: recentDiagnostics,
    clear: clearDiagnostics,
  };
}
