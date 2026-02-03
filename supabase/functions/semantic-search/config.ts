/**
 * Centralized configuration for semantic-search Edge Function
 * All magic numbers and thresholds are defined here for easy tuning
 */

export const CONFIG = {
  // Cache settings
  CACHE_TTL_MS: 30 * 60 * 1000, // 30 minutes for in-memory
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
  MAX_INPUT_QUERY_LENGTH: 500,
  MAX_SCRYFALL_QUERY_LENGTH: 400,
  DEFAULT_OVERLY_BROAD_THRESHOLD: 1500,

  // Client-side (for reference, used in src/lib/scryfall.ts)
  CLIENT_FETCH_TIMEOUT_MS: 8000,
  CLIENT_MAX_RETRIES: 2,
  CLIENT_MIN_REQUEST_INTERVAL_MS: 100,
  CLIENT_MAX_QUEUE_SIZE: 50,

  // Dynamic rules
  DYNAMIC_RULES_CACHE_TTL_MS: 10 * 60 * 1000, // 10 minutes
  DYNAMIC_RULES_LIMIT: 50,

  // AI settings
  AI_DEFAULT_MODEL: 'google/gemini-3-flash-preview',
  AI_TEMPERATURE: 0.1,
} as const;
