/**
 * Shared fetch utilities for Scryfall API calls.
 * Provides rate limiting, retry logic, and timeout handling.
 * @module lib/scryfall/fetch-utils
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
const MIN_REQUEST_INTERVAL = 50;
const MAX_QUEUE_SIZE = 10;
const QUEUE_ITEM_TIMEOUT_MS = FETCH_TIMEOUT_MS;

let queuedRequests = 0;
let nextRequestAllowedAt = 0;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetch with abort-controller timeout.
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs: number = FETCH_TIMEOUT_MS,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      credentials: 'omit',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with automatic retry on 429/5xx errors.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt <= retries) {
    try {
      const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, init);
      if (
        !response.ok &&
        (response.status === 429 || response.status >= 500) &&
        attempt < retries
      ) {
        await delay(300 * (attempt + 1));
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt >= retries) {
        throw lastError;
      }
      await delay(300 * (attempt + 1));
      attempt += 1;
    }
  }

  throw lastError ?? new Error('Request failed');
}

/**
 * Rate-limited fetch that enforces Scryfall's ≥50ms between requests.
 * Uses token-bucket style scheduling.
 */
export async function rateLimitedFetch(url: string): Promise<Response> {
  if (queuedRequests >= MAX_QUEUE_SIZE) {
    throw new Error('Too many pending requests. Please try again.');
  }

  queuedRequests += 1;

  try {
    const now = Date.now();
    const scheduledAt = Math.max(now, nextRequestAllowedAt);
    const waitMs = scheduledAt - now;
    nextRequestAllowedAt = scheduledAt + MIN_REQUEST_INTERVAL;

    if (waitMs > QUEUE_ITEM_TIMEOUT_MS) {
      throw new Error('Request timed out while waiting in queue');
    }

    if (waitMs > 0) {
      await delay(waitMs);
    }

    return await fetchWithRetry(url);
  } finally {
    queuedRequests = Math.max(0, queuedRequests - 1);
  }
}
