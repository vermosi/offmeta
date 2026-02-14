/**
 * Centralized configuration for client-side constants.
 * All magic numbers and thresholds are defined here for easy tuning.
 */

export const CLIENT_CONFIG = {
  // Virtualization settings
  VIRTUALIZATION_THRESHOLD: 50,

  // Search settings
  SEARCH_TIMEOUT_MS: 15000, // 15 seconds
  SEARCH_DEBOUNCE_MS: 300,

  // Cache settings
  RESULT_CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes
  MAX_CACHE_SIZE: 50,
  TRANSLATION_STALE_TIME_MS: 24 * 60 * 60 * 1000, // 24 hours
  CARD_SEARCH_STALE_TIME_MS: 5 * 60 * 1000, // 5 minutes

  // Rate limiting
  SEARCH_RATE_LIMIT: {
    maxPerMinute: 20,
    cooldownMs: 2000, // 2 second cooldown between identical searches
  },

  // History
  MAX_HISTORY_ITEMS: 20,

  // UI
  MAX_CARD_WIDTH: 280,
  PROGRESS_ANIMATION_DURATION_MS: 500,

  // Infinite scroll
  INFINITE_SCROLL_THRESHOLD: 0.1,
  INFINITE_SCROLL_ROOT_MARGIN: '200px',
} as const;
