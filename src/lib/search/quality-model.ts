export interface QueryQualitySignals {
  searches: number;
  clicks: number;
  refinements: number;
  recoveries: number;
  avgTimeToClickMs: number;
}

export interface QueryQualityResult extends QueryQualitySignals {
  score: number;
  updatedAt: number;
}

const STORAGE_KEY = 'offmeta_query_quality_signals';

function readStore(): Record<string, QueryQualityResult> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, QueryQualityResult>;
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, QueryQualityResult>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore storage failures
  }
}

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function computeScore(signals: QueryQualitySignals): number {
  const clickRate = signals.searches > 0 ? signals.clicks / signals.searches : 0;
  const refinementPenalty = Math.min(signals.refinements / Math.max(signals.searches, 1), 1);
  const recoveryBoost = Math.min(signals.recoveries / Math.max(signals.searches, 1), 1);
  const normalizedTtc = Math.max(0, Math.min(1, 1 - signals.avgTimeToClickMs / 4000));

  const raw =
    0.35 * clickRate +
    0.25 * normalizedTtc +
    0.20 * recoveryBoost +
    0.20 * (1 - refinementPenalty);

  return Math.round(Math.max(0, Math.min(1, raw)) * 1000) / 1000;
}

export function getQueryQuality(query: string): QueryQualityResult | null {
  const key = normalizeQuery(query);
  if (!key) return null;
  const store = readStore();
  return store[key] ?? null;
}

export function updateQueryQuality(
  query: string,
  update: Partial<QueryQualitySignals>,
): QueryQualityResult | null {
  const key = normalizeQuery(query);
  if (!key) return null;

  const store = readStore();
  const existing = store[key] ?? {
    searches: 0,
    clicks: 0,
    refinements: 0,
    recoveries: 0,
    avgTimeToClickMs: 0,
    score: 0,
    updatedAt: Date.now(),
  };

  const nextSignals: QueryQualitySignals = {
    searches: existing.searches + (update.searches ?? 0),
    clicks: existing.clicks + (update.clicks ?? 0),
    refinements: existing.refinements + (update.refinements ?? 0),
    recoveries: existing.recoveries + (update.recoveries ?? 0),
    avgTimeToClickMs:
      update.avgTimeToClickMs != null
        ? existing.avgTimeToClickMs > 0
          ? Math.round((existing.avgTimeToClickMs + update.avgTimeToClickMs) / 2)
          : update.avgTimeToClickMs
        : existing.avgTimeToClickMs,
  };

  const next: QueryQualityResult = {
    ...nextSignals,
    score: computeScore(nextSignals),
    updatedAt: Date.now(),
  };

  store[key] = next;
  writeStore(store);
  return next;
}
