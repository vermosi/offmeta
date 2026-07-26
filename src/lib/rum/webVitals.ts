/**
 * Real User Monitoring (RUM) for Core Web Vitals.
 * Captures LCP, CLS, INP (modern FID replacement) and FID using native
 * PerformanceObserver — no external dependency. Reports each metric once
 * to the `analytics_events` table on page hide / unload.
 *
 * Filters internal traffic (localhost, preview, founder flag) by NOT inserting.
 */

import { supabase } from '@/integrations/supabase/client';
import { classifyTraffic } from '@/lib/analytics/traffic';

type VitalName = 'LCP' | 'CLS' | 'INP' | 'FID';

interface VitalReport {
  name: VitalName;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

interface LayoutShiftEntry extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
  sources?: unknown[];
}

interface FirstInputEntry extends PerformanceEntry {
  processingStart: number;
}

interface EventTimingEntry extends PerformanceEntry {
  interactionId?: number;
  processingStart: number;
}

const reported = new Set<VitalName>();
const sessionId = (() => {
  try {
    const k = 'offmeta_rum_session';
    let id = sessionStorage.getItem(k);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(k, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
})();

function rate(name: VitalName, value: number): VitalReport['rating'] {
  // Thresholds per web.dev/vitals
  switch (name) {
    case 'LCP':
      return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor';
    case 'CLS':
      return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor';
    case 'INP':
      return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor';
    case 'FID':
      return value <= 100 ? 'good' : value <= 300 ? 'needs-improvement' : 'poor';
  }
}

function isInternal(): boolean {
  return classifyTraffic().isInternal;
}

function shouldSuppressInsert(): boolean {
  return classifyTraffic().shouldSuppressInsert;
}

const pending: VitalReport[] = [];

function queue(report: VitalReport) {
  if (reported.has(report.name)) return;
  reported.add(report.name);
  pending.push(report);
}

let flushed = false;

function flush() {
  if (flushed || pending.length === 0) return;
  flushed = true;
  if (shouldSuppressInsert()) return;

  const internal = isInternal();
  const path = window.location.pathname;
  const connection =
    (navigator as Navigator & { connection?: { effectiveType?: string } })
      .connection?.effectiveType ?? 'unknown';

  const rows = pending.map((r) => ({
    event_type: 'web_vital',
    session_id: sessionId,
    event_data: {
      name: r.name,
      value: r.value,
      rating: r.rating,
      path,
      connection,
      ...(internal && { is_internal: true }),
    },
  }));

  // Use sendBeacon-like behaviour: fire & forget; never block unload.
  void supabase.from('analytics_events').insert(rows).then(() => {
    /* noop */
  });
}

function observeLCP() {
  // Per web.dev: stop taking new LCP candidates after the first user
  // interaction or when the tab is hidden. Otherwise a tab left open in
  // the background reports an LCP of tens of minutes and skews p95.
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (!last) return;
      const value = Math.round(last.startTime);
      // Ignore obviously-bogus values (backgrounded tabs, clock jumps).
      // 60s is well beyond any real LCP; anything above is noise.
      if (!isFinite(value) || value < 0 || value > 60_000) return;
      reported.delete('LCP');
      const idx = pending.findIndex((p) => p.name === 'LCP');
      if (idx >= 0) pending.splice(idx, 1);
      queue({ name: 'LCP', value, rating: rate('LCP', value) });
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });

    const stop = () => {
      try { po.takeRecords(); } catch { /* ignore */ }
      try { po.disconnect(); } catch { /* ignore */ }
    };
    // Freeze LCP on first interaction or first hide — whichever comes first.
    addEventListener('keydown', stop, { once: true, capture: true });
    addEventListener('pointerdown', stop, { once: true, capture: true });
    addEventListener('click', stop, { once: true, capture: true });
    document.addEventListener('visibilitychange', function onVis() {
      if (document.visibilityState === 'hidden') {
        document.removeEventListener('visibilitychange', onVis);
        stop();
      }
    });
  } catch {
    /* unsupported */
  }
}

function observeCLS() {
  let clsValue = 0;
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShiftEntry[]) {
        if (!entry.hadRecentInput) clsValue += entry.value;
      }
      const rounded = Math.round(clsValue * 1000) / 1000;
      reported.delete('CLS');
      const idx = pending.findIndex((p) => p.name === 'CLS');
      if (idx >= 0) pending.splice(idx, 1);
      queue({ name: 'CLS', value: rounded, rating: rate('CLS', rounded) });
    });
    po.observe({ type: 'layout-shift', buffered: true });
  } catch {
    /* unsupported */
  }
}

function observeFID() {
  try {
    const po = new PerformanceObserver((list) => {
      const first = list.getEntries()[0] as FirstInputEntry | undefined;
      if (!first) return;
      const value = Math.round(first.processingStart - first.startTime);
      queue({ name: 'FID', value, rating: rate('FID', value) });
      po.disconnect();
    });
    po.observe({ type: 'first-input', buffered: true });
  } catch {
    /* unsupported */
  }
}

function observeINP() {
  // INP = worst (p98) interaction latency. We approximate with the max
  // event-timing duration across the page lifetime — simple and accurate
  // enough for aggregate p50/p95 dashboards.
  let maxDuration = 0;
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as EventTimingEntry[]) {
        if (entry.duration > maxDuration && entry.interactionId) {
          maxDuration = entry.duration;
        }
      }
      if (maxDuration > 0) {
        const value = Math.round(maxDuration);
        reported.delete('INP');
        const idx = pending.findIndex((p) => p.name === 'INP');
        if (idx >= 0) pending.splice(idx, 1);
        queue({ name: 'INP', value, rating: rate('INP', value) });
      }
    });
    po.observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit & {
      durationThreshold: number;
    });
  } catch {
    /* unsupported */
  }
}

let started = false;

/**
 * Initialize Web Vitals capture. Safe to call multiple times.
 */
export function initWebVitals(): void {
  if (started) return;
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;
  started = true;

  observeLCP();
  observeCLS();
  observeFID();
  observeINP();

  // Flush on page hide / unload — covers both backgrounding and navigation.
  const onHide = () => flush();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') onHide();
  });
  window.addEventListener('pagehide', onHide);
}
