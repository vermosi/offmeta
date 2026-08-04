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
} from './providers';

export { startSessionHeartbeat } from './sessionHeartbeat';
export { classifyTraffic } from './traffic';
