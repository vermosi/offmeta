/**
 * Lightweight profiler for the card search flow.
 *
 * Captures per-phase timings from query submission → translation →
 * Scryfall fetch → first render, so we can pinpoint where latency
 * comes from without pulling in a heavy tracing dependency.
 *
 * Enable in the browser with:
 *   localStorage.setItem('offmeta_profile_search', '1')
 *
 * Then inspect traces:
 *   window.__offmetaSearchProfiles        // last 20 traces
 *   window.__offmetaSearchProfiles.at(-1) // most recent
 *
 * Each completed trace also gets logged as a compact console.table.
 * Uses `performance.mark` / `performance.measure` so traces show up
 * inside Chrome DevTools → Performance panel under the "offmeta.search"
 * category.
 */

/* eslint-disable no-console */

const STORAGE_KEY = 'offmeta_profile_search';
const MAX_TRACES = 20;

export interface SearchTracePhase {
  name: string;
  atMs: number;
  sinceStartMs: number;
  sincePrevMs: number;
  meta?: Record<string, unknown>;
}

export interface SearchTrace {
  id: string;
  query: string;
  startedAt: number;
  endedAt?: number;
  totalMs?: number;
  phases: SearchTracePhase[];
  meta: Record<string, unknown>;
}

declare global {
  interface Window {
    __offmetaSearchProfiles?: SearchTrace[];
    __offmetaSearchProfilerEnable?: (on?: boolean) => void;
  }
}

let cachedEnabled: boolean | null = null;

function isEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (cachedEnabled !== null) return cachedEnabled;
  try {
    const flag = window.localStorage?.getItem(STORAGE_KEY);
    cachedEnabled =
      flag === '1' ||
      flag === 'true' ||
      // Auto-on in dev for developer feedback.
      (import.meta.env?.DEV ?? false);
  } catch {
    cachedEnabled = false;
  }
  return cachedEnabled;
}

function getTraces(): SearchTrace[] {
  if (typeof window === 'undefined') return [];
  if (!window.__offmetaSearchProfiles) window.__offmetaSearchProfiles = [];
  return window.__offmetaSearchProfiles;
}

const activeTraces = new Map<string, SearchTrace>();

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function safeMark(name: string) {
  try {
    performance.mark?.(name);
  } catch {
    /* ignore */
  }
}

function safeMeasure(name: string, from: string, to: string) {
  try {
    performance.measure?.(name, from, to);
  } catch {
    /* ignore */
  }
}

/**
 * Begin a new profiling trace. Returns the trace id (echoed back so callers
 * can correlate async work). No-op when profiling is disabled.
 */
export function startSearchTrace(
  query: string,
  meta: Record<string, unknown> = {},
): string {
  if (!isEnabled()) return '';
  const id = `search-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const startedAt = now();
  const trace: SearchTrace = {
    id,
    query,
    startedAt,
    phases: [{ name: 'start', atMs: startedAt, sinceStartMs: 0, sincePrevMs: 0 }],
    meta,
  };
  activeTraces.set(id, trace);
  safeMark(`offmeta.search:${id}:start`);
  return id;
}

/**
 * Record a phase transition on an in-flight trace.
 */
export function markSearchPhase(
  id: string,
  phase: string,
  meta?: Record<string, unknown>,
): void {
  if (!id || !isEnabled()) return;
  const trace = activeTraces.get(id);
  if (!trace) return;
  const at = now();
  const prev = trace.phases[trace.phases.length - 1];
  trace.phases.push({
    name: phase,
    atMs: at,
    sinceStartMs: at - trace.startedAt,
    sincePrevMs: at - (prev?.atMs ?? trace.startedAt),
    meta,
  });
  const markName = `offmeta.search:${id}:${phase}`;
  safeMark(markName);
  safeMeasure(
    `offmeta.search:${id}:${prev?.name ?? 'start'}→${phase}`,
    `offmeta.search:${id}:${prev?.name ?? 'start'}`,
    markName,
  );
}

/**
 * Close out the trace and push it into the ring buffer. Logs a compact
 * table view when profiling is enabled.
 */
export function endSearchTrace(
  id: string,
  meta?: Record<string, unknown>,
): SearchTrace | null {
  if (!id || !isEnabled()) return null;
  const trace = activeTraces.get(id);
  if (!trace) return null;
  activeTraces.delete(id);

  const endedAt = now();
  trace.endedAt = endedAt;
  trace.totalMs = endedAt - trace.startedAt;
  if (meta) trace.meta = { ...trace.meta, ...meta };

  markSearchPhase(id, 'end', meta);

  const traces = getTraces();
  traces.push(trace);
  if (traces.length > MAX_TRACES) traces.splice(0, traces.length - MAX_TRACES);

  try {
    console.groupCollapsed(
      `%c[search-profile] ${trace.query} — ${trace.totalMs?.toFixed(0)}ms`,
      'color:#8b5cf6;font-weight:600',
    );
    console.table(
      trace.phases.map((p) => ({
        phase: p.name,
        'Δ prev (ms)': +p.sincePrevMs.toFixed(1),
        'Δ start (ms)': +p.sinceStartMs.toFixed(1),
        meta: p.meta ? JSON.stringify(p.meta) : '',
      })),
    );
    console.log('meta', trace.meta);
    console.groupEnd();
  } catch {
    /* ignore console failures */
  }

  return trace;
}

/**
 * Toggle profiling at runtime (persists in localStorage).
 */
export function setSearchProfilingEnabled(on: boolean): void {
  cachedEnabled = on;
  try {
    if (on) window.localStorage?.setItem(STORAGE_KEY, '1');
    else window.localStorage?.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

// Expose a tiny helper in the browser console so devs can flip it without
// digging around in localStorage.
if (typeof window !== 'undefined') {
  window.__offmetaSearchProfilerEnable = (on = true) =>
    setSearchProfilingEnabled(on);
}
