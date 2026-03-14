/**
 * Tracks local DB vs Scryfall API hit rates for monitoring.
 * Lightweight in-memory counters with session persistence.
 * @module services/hit-rate-tracker
 */

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
  count: number; // number of cards resolved in this event
  timestamp: number;
}

interface HitRateStats {
  local: number;
  scryfall: number;
  cache: number;
  total: number;
  localPercent: number;
  byOperation: Record<HitOperation, { local: number; scryfall: number; cache: number }>;
  recentEvents: HitEvent[];
}

const SESSION_KEY = 'offmeta_hit_rate';
const MAX_EVENTS = 200;

let events: HitEvent[] = [];

// Restore from session on load
try {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (stored) events = JSON.parse(stored);
} catch {
  // ignore
}

function persist(): void {
  try {
    // Keep only recent events to avoid bloating sessionStorage
    if (events.length > MAX_EVENTS) {
      events = events.slice(-MAX_EVENTS);
    }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(events));
  } catch {
    // ignore quota errors
  }
}

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
  events.push({
    source,
    operation,
    count,
    timestamp: Date.now(),
  });
  persist();
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
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}
