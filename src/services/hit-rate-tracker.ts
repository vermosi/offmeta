/**
 * Tracks local DB vs Scryfall API hit rates for monitoring.
 * Lightweight in-memory counters with session persistence
 * and periodic flush to analytics_events table.
 * @module services/hit-rate-tracker
 */

// supabase import removed — flushToDb is now a no-op

export type HitSource = 'local' | 'scryfall' | 'cache';
export type HitOperation =
  | 'card_by_name'
  | 'cards_batch'
  | 'autocomplete'
  | 'random_card'
  | 'price_lookup';

interface HitEvent {
  source: HitSource;
  operation: HitOperation;
  count: number;
  timestamp: number;
}

interface HitRateStats {
  local: number;
  scryfall: number;
  cache: number;
  total: number;
  localPercent: number;
  byOperation: Record<
    HitOperation,
    { local: number; scryfall: number; cache: number }
  >;
  recentEvents: HitEvent[];
}

const SESSION_KEY = 'offmeta_hit_rate';
const MAX_EVENTS = 200;
const FLUSH_INTERVAL_MS = 30_000;
const FLUSH_BATCH_SIZE = 50;

let events: HitEvent[] = [];
let pendingFlush: HitEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let visibilityListenerRegistered = false;

// Restore from session on load
try {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) events = JSON.parse(stored);
} catch {
  // ignore
}

function getSessionId(): string | null {
  try {
    return sessionStorage.getItem('offmeta_session_id');
  } catch {
    return null;
  }
}

function persist(): void {
  try {
    if (events.length > MAX_EVENTS) {
      events = events.slice(-MAX_EVENTS);
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(events));
  } catch {
    // ignore quota errors
  }
}

/**
 * Flush pending hit events — intentionally a no-op.
 *
 * Previously wrote aggregated hit_rate rows to analytics_events.
 * Removed to eliminate operational noise (~235 rows/30 days).
 * In-memory stats via getHitRateStats() remain functional.
 */
async function flushToDb(): Promise<void> {
  // no-op — clear pending to prevent unbounded growth
  pendingFlush = [];
}

function scheduleFlush(): void {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushToDb();
  }, FLUSH_INTERVAL_MS);
}

function handleVisibilityChange(): void {
  if (document.visibilityState === 'hidden' && pendingFlush.length > 0) {
    void flushToDb();
  }
}

function registerVisibilityFlush(): void {
  if (typeof document === 'undefined' || visibilityListenerRegistered) {
    return;
  }

  document.addEventListener('visibilitychange', handleVisibilityChange);
  visibilityListenerRegistered = true;
}

registerVisibilityFlush();

/**
 * Record a data source hit.
 * @param source - Where the data came from
 * @param operation - What type of lookup
 * @param count - Number of items resolved (default 1)
 */
export function recordHit(
  source: HitSource,
  operation: HitOperation,
  count = 1,
): void {
  const event: HitEvent = {
    source,
    operation,
    count,
    timestamp: Date.now(),
  };
  events.push(event);
  pendingFlush.push(event);
  persist();
  scheduleFlush();
}

/**
 * Get aggregated hit rate statistics.
 */
export function getHitRateStats(): HitRateStats {
  const ops: HitOperation[] = [
    'card_by_name',
    'cards_batch',
    'autocomplete',
    'random_card',
    'price_lookup',
  ];

  const byOperation = {} as Record<
    HitOperation,
    { local: number; scryfall: number; cache: number }
  >;
  for (const op of ops) {
    byOperation[op] = { local: 0, scryfall: 0, cache: 0 };
  }

  let local = 0;
  let scryfall = 0;
  let cache = 0;

  for (const e of events) {
    switch (e.source) {
      case 'local':
        local += e.count;
        break;
      case 'scryfall':
        scryfall += e.count;
        break;
      case 'cache':
        cache += e.count;
        break;
    }
    if (byOperation[e.operation]) {
      byOperation[e.operation][e.source] += e.count;
    }
  }

  const total = local + scryfall + cache;

  return {
    local,
    scryfall,
    cache,
    total,
    localPercent: total > 0 ? Math.round((local / total) * 100) : 0,
    byOperation,
    recentEvents: events.slice(-20),
  };
}

/** Clear all tracked events. */
export function clearHitRateStats(): void {
  events = [];
  pendingFlush = [];
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

/** Force flush pending events to DB immediately. */
export function forceFlushHitRates(): Promise<void> {
  return flushToDb();
}
