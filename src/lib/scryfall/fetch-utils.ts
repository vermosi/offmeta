/**
 * Shared fetch utilities for Scryfall API calls.
 *
 * Scryfall asks clients to stay under ~10 requests/second, leave 50–100ms
 * between calls, send an `Accept` header, and back off when a 429 arrives
 * (https://scryfall.com/docs/api). Every request built here is paced through a
 * single scheduler and pauses globally while a rate-limit cool-off is active.
 *
 * @module lib/scryfall/fetch-utils
 */

const FETCH_TIMEOUT_MS = 8000;
const MAX_RETRIES = 2;
/** Conservative end of Scryfall's recommended 50–100ms spacing. */
const MIN_REQUEST_INTERVAL = 100;
const MAX_QUEUE_SIZE = 10;
const QUEUE_ITEM_TIMEOUT_MS = FETCH_TIMEOUT_MS;
/** Fallback cool-off when a 429 arrives without a Retry-After header. */
const DEFAULT_COOLDOWN_MS = 2000;
const MAX_COOLDOWN_MS = 60_000;
/** Consecutive failed calls (timeout, network, 5xx) before the breaker trips. */
const CIRCUIT_FAILURE_THRESHOLD = 4;
/** How long the breaker stays open before a single probe is allowed through. */
const CIRCUIT_OPEN_MS = 30_000;

let queuedRequests = 0;
let nextRequestAllowedAt = 0;
let cooldownUntil = 0;
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
let probeInFlight = false;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Thrown while the circuit breaker is open — Scryfall is not called at all. */
export class ScryfallUnavailableError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super(
      `Scryfall is unavailable; retrying in ${Math.ceil(retryAfterMs / 1000)}s`,
    );
    this.name = 'ScryfallUnavailableError';
    this.retryAfterMs = retryAfterMs;
  }
}

/** Milliseconds remaining in the current Scryfall cool-off (0 when clear). */
export function scryfallCooldownRemainingMs(): number {
  return Math.max(0, cooldownUntil - Date.now());
}

/** Milliseconds left in the open circuit-breaker window (0 when closed). */
export function scryfallCircuitRemainingMs(): number {
  return Math.max(0, circuitOpenUntil - Date.now());
}

/** True while Scryfall calls short-circuit instead of hitting the network. */
export function isScryfallCircuitOpen(): boolean {
  return scryfallCircuitRemainingMs() > 0;
}

function recordFailure(): void {
  consecutiveFailures += 1;
  if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    circuitOpenUntil = Date.now() + CIRCUIT_OPEN_MS;
  }
}

function recordSuccess(): void {
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
}

/** Test helper: clears pacing, cool-off and circuit-breaker state. */
export function resetScryfallFetchState(): void {
  queuedRequests = 0;
  nextRequestAllowedAt = 0;
  cooldownUntil = 0;
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
  probeInFlight = false;
}


function parseRetryAfterMs(response: Response): number {
  const header = response.headers.get('Retry-After');
  if (!header) return DEFAULT_COOLDOWN_MS;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) {
    return Math.min(seconds * 1000, MAX_COOLDOWN_MS);
  }
  const date = Date.parse(header);
  if (!Number.isNaN(date)) {
    return Math.min(Math.max(date - Date.now(), 0), MAX_COOLDOWN_MS);
  }
  return DEFAULT_COOLDOWN_MS;
}

function withScryfallHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  return { ...init, headers };
}

/** Reserves this request's slot in the ≥100ms scheduler. */
async function acquireSlot(): Promise<void> {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextRequestAllowedAt, cooldownUntil);
  nextRequestAllowedAt = scheduledAt + MIN_REQUEST_INTERVAL;
  const waitMs = scheduledAt - now;
  if (waitMs > 0) await delay(waitMs);
}

/**
 * Fetch with abort-controller timeout. Does not pace requests — prefer
 * {@link fetchWithRetry} or {@link rateLimitedFetch} for Scryfall traffic.
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
      ...withScryfallHeaders(init),
      signal: controller.signal,
      credentials: 'omit',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Paced fetch with automatic retry on 429/5xx errors.
 * A 429 sets a global cool-off (honouring Retry-After) so every other
 * in-flight Scryfall call waits instead of hammering the API.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let attempt = 0;
  let lastError: Error | undefined;

  while (attempt <= retries) {
    await acquireSlot();
    try {
      const response = await fetchWithTimeout(url, FETCH_TIMEOUT_MS, init);

      if (response.status === 429 || response.status === 503) {
        const retryAfterMs = parseRetryAfterMs(response);
        cooldownUntil = Math.max(cooldownUntil, Date.now() + retryAfterMs);
        if (attempt < retries) {
          attempt += 1;
          continue;
        }
        return response;
      }

      if (response.status >= 500 && attempt < retries) {
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
 * Rate-limited fetch for user-driven Scryfall calls.
 * Adds a queue ceiling on top of {@link fetchWithRetry} so bursts fail fast
 * instead of stacking up behind the scheduler.
 */
export async function rateLimitedFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  if (queuedRequests >= MAX_QUEUE_SIZE) {
    throw new Error('Too many pending requests. Please try again.');
  }

  const cooldown = scryfallCooldownRemainingMs();
  if (cooldown > QUEUE_ITEM_TIMEOUT_MS) {
    throw new Error('Scryfall is rate limiting requests. Please try again shortly.');
  }

  queuedRequests += 1;

  try {
    const queueWaitMs = Math.max(0, nextRequestAllowedAt - Date.now());
    if (queueWaitMs > QUEUE_ITEM_TIMEOUT_MS) {
      throw new Error('Request timed out while waiting in queue');
    }

    return await fetchWithRetry(url, init);
  } finally {
    queuedRequests = Math.max(0, queuedRequests - 1);
  }
}
