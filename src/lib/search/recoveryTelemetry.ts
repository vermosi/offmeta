/**
 * Records which recovery path a zero-result search took, so the terminal
 * `search_failure` event can report *how* we tried to rescue the query — not
 * just that it failed.
 *
 * The recovery attempt (in `searchRecovery`) and the terminal failure event
 * (in `useSearch`) happen in different places and different ticks, so the path
 * is stashed per normalized query in a bounded in-memory map.
 *
 * @module lib/search/recoveryTelemetry
 */

/** Which rescue path ran for a zero-result query. */
export type FallbackPath =
  | 'none'
  /** Alternatives intent detected and resolved to a similarity query. */
  | 'alternatives_similarity'
  /** Alternatives intent detected but the reference card didn't resolve. */
  | 'alternatives_unresolved'
  /** Fuzzy card-name resolver produced a canonical name. */
  | 'fuzzy_name'
  /** Fuzzy resolver ran and found nothing. */
  | 'fuzzy_failed'
  /** Generic client-side query broadening. */
  | 'client_broadening';

export interface RecoveryAttempt {
  path: FallbackPath;
  /** Wrapper phrasing detected for the query, when any. */
  alternativesIntent?: string;
  /** Reference card the wrapper phrasing pointed at. */
  alternativesCard?: string;
}

const MAX_ENTRIES = 50;
const attempts = new Map<string, RecoveryAttempt>();

function normalize(query: string): string {
  return query.trim().toLowerCase();
}

export function recordRecoveryAttempt(
  query: string,
  attempt: RecoveryAttempt,
): void {
  const key = normalize(query);
  if (!key) return;

  const previous = attempts.get(key);
  attempts.delete(key);
  // Merge so a later fuzzy/broadening step keeps the detected intent labels.
  attempts.set(key, { ...previous, ...attempt });

  while (attempts.size > MAX_ENTRIES) {
    const oldest = attempts.keys().next().value;
    if (oldest === undefined) break;
    attempts.delete(oldest);
  }
}

export function getRecoveryAttempt(query: string): RecoveryAttempt {
  return attempts.get(normalize(query)) ?? { path: 'none' };
}

export function clearRecoveryAttempts(): void {
  attempts.clear();
}
