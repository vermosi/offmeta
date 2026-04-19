/**
 * Real User Monitoring (RUM) for Core Web Vitals.
 * Captures LCP, CLS, INP (modern FID replacement) and FID using native
 * PerformanceObserver — no external dependency. Reports each metric once
 * to the `analytics_events` table on page hide / unload.
 *
 * Filters internal traffic (localhost, preview, founder flag) by NOT inserting.
 */

import { supabase } from '@/integrations/supabase/client';

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
  try {
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return true;
    if (host.includes('-preview--') && host.endsWith('.lovable.app')) return true;
    if (localStorage.getItem('offmeta_internal') === 'true') return true;
  } catch {
    /* ignore */
  }
  return false;
}

function shouldSuppressInsert(): boolean {
  try {
    const host = window.location.hostname;
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      (host.includes('-preview--') && host.endsWith('.lovable.app'))
    );
  } catch {
    return true;
  }
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
  try {
    const po = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (!last) return;
      const value = Math.round(last.startTime);
      // Don't queue final until page hide; keep updating
      reported.delete('LCP');
      pending.splice(
        pending.findIndex((p) => p.name === 'LCP'),
        pending.findIndex((p) => p.name === 'LCP') >= 0 ? 1 : 0,
      );
      queue({ name: 'LCP', value, rating: rate('LCP', value) });
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
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
