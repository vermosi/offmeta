/**
 * PostHog funnel + retention instrumentation.
 *
 * Emits a small, stable set of funnel step events so PostHog funnels can be
 * built without depending on ad-hoc product events:
 *
 *   1. funnel_search      — user ran a search and got results
 *   2. funnel_guide_open  — user opened a guide
 *   3. funnel_card_view   — user viewed a card detail page
 *   4. funnel_combo_save  — user saved a combo
 *
 * Every event (and the person profile) carries an `onboarding_cohort`
 * (ISO week of first visit) plus `onboarding_day`, so retention charts can be
 * broken down per onboarding cohort. A once-per-day `retention_active` event
 * provides the returning-user signal that PostHog retention views use.
 *
 * All calls are best-effort and never throw.
 */

import {
  registerExternalSuperProperties,
  setExternalPersonProperties,
  trackExternalEvent,
} from './providers';

const FIRST_VISIT_KEY = 'offmeta_first_visit_at';
const COHORT_KEY = 'offmeta_onboarding_cohort';
const RETENTION_PING_KEY = 'offmeta_retention_last_ping';

const DAY_MS = 24 * 60 * 60 * 1000;

export const FUNNEL_STEPS = {
  search: { event: 'funnel_search', index: 1 },
  guide_open: { event: 'funnel_guide_open', index: 2 },
  card_view: { event: 'funnel_card_view', index: 3 },
  combo_save: { event: 'funnel_combo_save', index: 4 },
} as const;

export type FunnelStep = keyof typeof FUNNEL_STEPS;

type FunnelProperties = Record<string, string | number | boolean | undefined>;

function safeLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/** Monday-anchored ISO week start (UTC) formatted as YYYY-MM-DD. */
export function toCohortWeek(timestamp: number): string {
  const date = new Date(timestamp);
  const day = (date.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) -
      day * DAY_MS,
  );
  return monday.toISOString().slice(0, 10);
}

/** First-visit timestamp, seeded on first call. */
export function getFirstVisitAt(): number {
  const store = safeLocalStorage();
  const now = Date.now();
  if (!store) return now;

  const raw = store.getItem(FIRST_VISIT_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) return parsed;

  try {
    store.setItem(FIRST_VISIT_KEY, String(now));
  } catch {
    /* private browsing */
  }
  return now;
}

/** Stable onboarding cohort (ISO week of first visit). */
export function getOnboardingCohort(): string {
  const store = safeLocalStorage();
  const cached = store?.getItem(COHORT_KEY);
  if (cached) return cached;

  const cohort = toCohortWeek(getFirstVisitAt());
  try {
    store?.setItem(COHORT_KEY, cohort);
  } catch {
    /* private browsing */
  }
  return cohort;
}

/** Whole days elapsed since the user's first visit. */
export function getOnboardingDay(): number {
  return Math.max(0, Math.floor((Date.now() - getFirstVisitAt()) / DAY_MS));
}

function cohortProperties(): Record<string, string | number> {
  return {
    onboarding_cohort: getOnboardingCohort(),
    onboarding_day: getOnboardingDay(),
  };
}

/**
 * Register cohort context as PostHog super + person properties, and emit the
 * daily retention ping. Call once at app start, after initializeAnalytics.
 */
export function initFunnelTracking(): void {
  if (typeof window === 'undefined') return;

  const firstVisitAt = getFirstVisitAt();
  const props = cohortProperties();

  registerExternalSuperProperties(props);
  setExternalPersonProperties({
    onboarding_cohort: props.onboarding_cohort,
    first_visit_at: new Date(firstVisitAt).toISOString(),
  });

  trackRetentionActivity();
}

/**
 * Emit `retention_active` at most once per calendar day so PostHog retention
 * views (broken down by `onboarding_cohort`) have a reliable return signal.
 */
export function trackRetentionActivity(): void {
  const store = safeLocalStorage();
  const today = new Date().toISOString().slice(0, 10);
  if (store?.getItem(RETENTION_PING_KEY) === today) return;

  try {
    store?.setItem(RETENTION_PING_KEY, today);
  } catch {
    /* private browsing */
  }

  trackExternalEvent('retention_active', {
    ...cohortProperties(),
    date: today,
    is_new_user: getOnboardingDay() === 0,
  });
}

/** Emit a funnel step event with cohort context attached. */
export function trackFunnelStep(
  step: FunnelStep,
  properties: FunnelProperties = {},
): void {
  if (typeof window === 'undefined') return;

  const definition = FUNNEL_STEPS[step];
  const clean: FunnelProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) clean[key] = value;
  }

  trackExternalEvent(definition.event, {
    ...clean,
    ...cohortProperties(),
    funnel_step: definition.index,
    funnel_step_name: step,
  });

  // The first time a user reaches a step, also emit the onboarding milestone
  // so intent is measurable even when session replay is short or missing.
  trackFunnelMilestone(`first_${step}` as FunnelMilestone, clean);

  // Any funnel action also counts as activity for the retention view.
  trackRetentionActivity();
}

/* ------------------------------------------------------------------ */
/* Onboarding milestones (once per user, persisted in localStorage)    */
/* ------------------------------------------------------------------ */

export const FUNNEL_MILESTONES = [
  'first_route_view',
  'first_search',
  'first_result',
  'first_card_view',
  'first_guide_open',
  'first_combo_save',
] as const;

export type FunnelMilestone = (typeof FUNNEL_MILESTONES)[number];

const MILESTONE_KEY_PREFIX = 'offmeta_milestone:';

/** True when the milestone has already been recorded for this browser. */
export function hasReachedMilestone(milestone: FunnelMilestone): boolean {
  return safeLocalStorage()?.getItem(MILESTONE_KEY_PREFIX + milestone) === '1';
}

/**
 * Emit a one-time onboarding milestone event (`funnel_first_*`) with cohort
 * context. Returns true when the event was emitted (first time only).
 */
export function trackFunnelMilestone(
  milestone: FunnelMilestone,
  properties: FunnelProperties = {},
): boolean {
  if (typeof window === 'undefined') return false;
  if (!FUNNEL_MILESTONES.includes(milestone)) return false;
  if (hasReachedMilestone(milestone)) return false;

  try {
    safeLocalStorage()?.setItem(MILESTONE_KEY_PREFIX + milestone, '1');
  } catch {
    /* private browsing — event still fires, may repeat */
  }

  const clean: FunnelProperties = {};
  for (const [key, value] of Object.entries(properties)) {
    if (value !== undefined) clean[key] = value;
  }

  trackExternalEvent(`funnel_${milestone}`, {
    ...clean,
    ...cohortProperties(),
    milestone,
    ms_since_first_visit: Date.now() - getFirstVisitAt(),
  });

  setExternalPersonProperties({
    [`${milestone}_at`]: new Date().toISOString(),
  });

  return true;
}

