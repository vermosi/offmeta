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
/** How long a successful GET response is replayed to equivalent requests. */
const DEDUPE_TTL_MS = 10_000;
/** Upper bound on cached responses. */
const DEDUPE_CACHE_MAX = 100;

let queuedRequests = 0;
let nextRequestAllowedAt = 0;
let cooldownUntil = 0;
let consecutiveFailures = 0;
let circuitOpenUntil = 0;
let probeInFlight = false;
/** Equivalent GETs currently awaiting the same upstream response. */
const inFlight = new Map<string, Promise<Response>>();
/** Recently completed successful GETs, replayed for {@link DEDUPE_TTL_MS}. */
const responseCache = new Map<string, { response: Response; expiresAt: number }>();

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

/** Test helper: clears pacing, cool-off, circuit-breaker and dedupe state. */
export function resetScryfallFetchState(): void {
  queuedRequests = 0;
  nextRequestAllowedAt = 0;
  cooldownUntil = 0;
  consecutiveFailures = 0;
  circuitOpenUntil = 0;
  probeInFlight = false;
  inFlight.clear();
  responseCache.clear();
}

/**
 * Canonical key for an "equivalent" Scryfall GET: parameter order and
 * surrounding/duplicated whitespace inside values (notably `q`) do not change
 * the result, so they must not produce a second upstream request.
 */
function dedupeKey(url: string): string {
  try {
    const parsed = new URL(url, 'https://api.scryfall.com');
    const params = [...parsed.searchParams.entries()]
      .map(([k, v]) => [k, v.trim().replace(/\s+/g, ' ')] as const)
      .sort(([a, av], [b, bv]) => (a === b ? av.localeCompare(bv) : a.localeCompare(b)));
    const search = new URLSearchParams(params.map(([k, v]) => [k, v]));
    return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}?${search.toString()}`;
  } catch {
    return url;
  }
}

/** Mocks and non-standard responses may lack `clone()`; never share those. */
function isCloneable(response: Response): boolean {
  return typeof (response as { clone?: unknown }).clone === 'function';
}

function cacheResponse(key: string, response: Response): void {
  if (!isCloneable(response)) return;
  if (responseCache.size >= DEDUPE_CACHE_MAX) {
    const oldest = responseCache.keys().next().value;
    if (oldest !== undefined) responseCache.delete(oldest);
  }
  responseCache.set(key, {
    response: response.clone(),
    expiresAt: Date.now() + DEDUPE_TTL_MS,
  });
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
 *
 * Equivalent GETs (same URL ignoring parameter order and query whitespace)
 * share one upstream request while it is in flight, and replay a successful
 * response for {@link DEDUPE_TTL_MS} afterwards.
 *
 * After {@link CIRCUIT_FAILURE_THRESHOLD} consecutive failures the circuit
 * breaker opens and calls throw {@link ScryfallUnavailableError} immediately
 * for {@link CIRCUIT_OPEN_MS}; one probe then re-tests the API.
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();
  if (method !== 'GET') return performFetchWithRetry(url, init, retries);

  const key = dedupeKey(url);

  const cached = responseCache.get(key);
  if (cached) {
    if (cached.expiresAt > Date.now()) return cached.response.clone();
    responseCache.delete(key);
  }

  const pending = inFlight.get(key);
  if (pending) {
    const shared = await pending;
    if (isCloneable(shared)) return shared.clone();
  }

  const request = performFetchWithRetry(url, init, retries).then((response) => {
    if (response.ok) cacheResponse(key, response);
    return response;
  });
  inFlight.set(key, request);

  try {
    const response = await request;
    return isCloneable(response) ? response.clone() : response;
  } finally {
    if (inFlight.get(key) === request) inFlight.delete(key);
  }
}

async function performFetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  const circuitRemaining = scryfallCircuitRemainingMs();
  if (circuitRemaining > 0) {
    throw new ScryfallUnavailableError(circuitRemaining);
  }

  // Half-open: allow a single probe rather than a burst of retries.
  let ownsProbe = false;
  if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    if (probeInFlight) throw new ScryfallUnavailableError(CIRCUIT_OPEN_MS);
    probeInFlight = true;
    ownsProbe = true;
  }


  let attempt = 0;
  let lastError: Error | undefined;

  try {
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
          recordFailure();
          return response;
        }

        if (response.status >= 500 && attempt < retries) {
          await delay(300 * (attempt + 1));
          attempt += 1;
          continue;
        }

        if (response.status >= 500) recordFailure();
        else recordSuccess();
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt >= retries) {
          recordFailure();
          throw lastError;
        }
        await delay(300 * (attempt + 1));
        attempt += 1;
      }
    }

    recordFailure();
    throw lastError ?? new Error('Request failed');
  } finally {
    if (ownsProbe) probeInFlight = false;
  }
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

  const circuitRemaining = scryfallCircuitRemainingMs();
  if (circuitRemaining > 0) {
    throw new ScryfallUnavailableError(circuitRemaining);
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
