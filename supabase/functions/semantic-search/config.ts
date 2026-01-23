/**
 * Centralized configuration for semantic-search Edge Function
 */

export const CONFIG = {
  // Cache settings
  CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes
  CACHE_MAX_SIZE: 1000,
  PERSISTENT_CACHE_TTL_MS: 48 * 60 * 60 * 1000, // 48 hours
  CACHE_MIN_CONFIDENCE: 0.7,

  // HTTP settings
  FETCH_TIMEOUT_MS: 15000,
  MAX_FETCH_RETRIES: 2,
  RETRYABLE_STATUS: new Set([429, 500, 502, 503, 504]),

  // Circuit breaker settings
  CIRCUIT_FAILURE_THRESHOLD: 5,
  CIRCUIT_RESET_TIMEOUT_MS: 60000, // 1 minute

  // Rate limiting settings
  RATE_LIMIT_PER_IP: 30,
  RATE_LIMIT_GLOBAL: 1000,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute

  // Logging settings
  LOG_BATCH_SIZE: 10,
  LOG_BATCH_INTERVAL_MS: 5000, // 5 seconds

  // Query validation
  MAX_QUERY_LENGTH: 500,
  MAX_SCRYFALL_QUERY_LENGTH: 400,
  DEFAULT_OVERLY_BROAD_THRESHOLD: 1500,
} as const;
