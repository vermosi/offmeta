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
  trackFunnelMilestone,
  hasReachedMilestone,
  trackRetentionActivity,
  getOnboardingCohort,
  getOnboardingDay,
  toCohortWeek,
  FUNNEL_STEPS,
  FUNNEL_MILESTONES,
  type FunnelStep,
  type FunnelMilestone,
} from './funnels';


export { startSessionHeartbeat } from './sessionHeartbeat';
export { classifyTraffic } from './traffic';
export {
  initAudienceContext,
  collectEnvironmentContext,
  resolveAttribution,
  parseAttributionParams,
  classifyReferrer,
} from './context';

