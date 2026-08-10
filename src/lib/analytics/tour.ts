/**
 * Homepage guided-tour analytics.
 *
 * Emits a small, stable PostHog event set so drop-off per tour step can be
 * measured as a funnel:
 *
 *   tour_offered        — invitation pill shown
 *   tour_started        — visitor opened the tour
 *   tour_step_viewed    — one event per step (funnel steps)
 *   tour_skipped        — closed before the last step
 *   tour_completed      — advanced past the last step
 *   tour_invite_dismissed — pill dismissed without starting
 *
 * All calls are best-effort and never throw.
 */

import { trackExternalEvent } from './providers';

export type TourEvent =
  | 'tour_offered'
  | 'tour_started'
  | 'tour_step_viewed'
  | 'tour_skipped'
  | 'tour_completed'
  | 'tour_invite_dismissed';

export type TourProperties = Record<
  string,
  string | number | boolean | undefined
>;

const DEFAULT_TOUR_ID = 'homepage';

/** Emit a tour analytics event with a stable `tour_id` attached. */
export function trackTourEvent(
  event: TourEvent,
  properties: TourProperties = {},
): void {
  if (typeof window === 'undefined') return;

  const clean: TourProperties = { tour_id: DEFAULT_TOUR_ID };
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) clean[key] = value;
  }

  trackExternalEvent(event, clean);
}
