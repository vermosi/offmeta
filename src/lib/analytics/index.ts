/**
 * Unified analytics entry point.
 *
 * Combines the native Supabase analytics_events pipeline (useAnalytics) with
 * optional third-party providers (Google Analytics 4, PostHog) initialized from
 * Lovable connector env vars.
 */

export {
  initializeAnalytics,
  trackExternalEvent,
  trackExternalPageView,
  identifyExternalUser,
  resetExternalUser,
  registerExternalSuperProperties,
  setExternalPersonProperties,
} from './providers';

export {
  shouldRecordSession,
  isReplayBlockedPath,
  allowEvent,
  getDroppedEventCount,
  resetEventLimiter,
  REPLAY_SAMPLE_RATE,
} from './replay';

export {
  initFunnelTracking,
  trackFunnelStep,
  trackRetentionActivity,
  getOnboardingCohort,
  getOnboardingDay,
  toCohortWeek,
  FUNNEL_STEPS,
  type FunnelStep,
} from './funnels';

export { startSessionHeartbeat } from './sessionHeartbeat';
export { classifyTraffic } from './traffic';
