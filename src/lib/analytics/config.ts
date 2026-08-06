/**
 * Analytics provider configuration.
 *
 * Values come from the Lovable connector env vars when the build environment
 * injects them. Production builds have intermittently shipped without those
 * `VITE_LOVABLE_CONNECTOR_*` vars, which silently disabled GA4 and PostHog, so
 * publishable fallbacks are committed here. Both identifiers are public by
 * design (GA measurement ID and PostHog project token are meant to ship in the
 * browser bundle); no secret values belong in this file.
 *
 * @module lib/analytics/config
 */

/** Publishable GA4 measurement ID for offmeta.app. */
const GA_MEASUREMENT_ID_FALLBACK = 'G-RY9CP8J2VY';

/** Publishable PostHog project token for offmeta.app. */
const POSTHOG_PROJECT_TOKEN_FALLBACK = '__POSTHOG_TOKEN__';

/** PostHog ingest region for the project. */
const POSTHOG_REGION_FALLBACK = 'us';

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

/** Resolved GA4 measurement ID, or undefined when analytics is disabled. */
export const googleAnalyticsMeasurementId = firstNonEmpty(
  import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_ANALYTICS_API_KEY,
  GA_MEASUREMENT_ID_FALLBACK,
);

/** Resolved PostHog project token, or undefined when analytics is disabled. */
export const posthogProjectToken = firstNonEmpty(
  import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_API_KEY,
  POSTHOG_PROJECT_TOKEN_FALLBACK,
);

/** Resolved PostHog ingest region (`us` or `eu`). */
export const posthogRegion = firstNonEmpty(
  import.meta.env.VITE_LOVABLE_CONNECTOR_POSTHOG_REGION,
  POSTHOG_REGION_FALLBACK,
);
