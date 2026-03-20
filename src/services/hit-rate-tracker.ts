/**
 * Tracks local DB vs Scryfall API hit rates for monitoring.
 * Lightweight in-memory counters with session persistence
 * and periodic flush to analytics_events table.
 * @module services/hit-rate-tracker
 */

import { supabase } from '@/integrations/supabase/client';

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
 * Flush pending hit events to analytics_events table.
 * Aggregates by source+operation to reduce row count.
 */
async function flushToDb(): Promise<void> {
  if (pendingFlush.length === 0) return;

  const batch = pendingFlush.splice(0, FLUSH_BATCH_SIZE);
  const sessionId = getSessionId();

  // Aggregate by source+operation for compact storage
  const aggregated = new Map<
    string,
    {
      source: HitSource;
      operation: HitOperation;
      count: number;
      firstTs: number;
      lastTs: number;
    }
  >();

  for (const e of batch) {
    const key = `${e.source}::${e.operation}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.count += e.count;
      existing.lastTs = Math.max(existing.lastTs, e.timestamp);
    } else {
      aggregated.set(key, {
        source: e.source,
        operation: e.operation,
        count: e.count,
        firstTs: e.timestamp,
        lastTs: e.timestamp,
      });
    }
  }

  const rows = Array.from(aggregated.values()).map((a) => ({
    event_type: 'hit_rate',
    session_id: sessionId,
    event_data: {
      source: a.source,
      operation: a.operation,
      count: a.count,
      first_ts: a.firstTs,
      last_ts: a.lastTs,
    },
  }));

  try {
    await supabase.from('analytics_events').insert(rows);
  } catch {
    // Re-queue on failure so we don't lose data
    pendingFlush.unshift(...batch);
  }
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
