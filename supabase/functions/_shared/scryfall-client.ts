/**
 * Shared Scryfall HTTP client for edge functions.
 *
 * Scryfall asks API consumers to (https://scryfall.com/docs/api):
 *  - send a descriptive User-Agent and an Accept header
 *  - insert 50–100ms of delay between requests (~10 req/s ceiling)
 *  - back off when a 429 is returned, honouring Retry-After
 *
 * Every server-side Scryfall call should go through `scryfallFetch` so pacing,
 * identification and back-off are enforced in one place instead of per caller.
 *
 * @module _shared/scryfall-client
 */

export const SCRYFALL_USER_AGENT = 'OffMeta/1.0 (+https://offmeta.app)';

/** Conservative end of Scryfall's recommended 50–100ms spacing. */
const MIN_REQUEST_INTERVAL_MS = 100;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_RETRIES = 2;
/** Fallback cool-off when a 429 arrives without a Retry-After header. */
const DEFAULT_COOLDOWN_MS = 2000;
const MAX_COOLDOWN_MS = 60_000;
/** Requests already waiting in the pacing queue before we shed load. */
const MAX_QUEUE_DEPTH = 12;
/** Consecutive failed calls (timeout, network, 5xx, exhausted 429) to trip. */
const CIRCUIT_FAILURE_THRESHOLD = 4;
/** How long the breaker stays open before a single probe is allowed through. */
const CIRCUIT_OPEN_MS = 30_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Per-isolate pacing state. Edge isolates are short-lived and shared across
// concurrent requests, so this both spaces out calls and absorbs bursts.
let nextRequestAllowedAt = 0;
let queueDepth = 0;
/** Set when Scryfall returns 429/503: no request is sent before this time. */
let cooldownUntil = 0;
/** Consecutive failures observed since the last successful response. */
let consecutiveFailures = 0;
/** While in the future, the breaker is open and no request is sent. */
let circuitOpenUntil = 0;
/** Guards the single half-open probe once the open window has elapsed. */
let probeInFlight = false;

export class ScryfallRateLimitError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) {
    super(
      `Scryfall rate limit active; retry in ${Math.ceil(retryAfterMs / 1000)}s`,
    );
    this.name = 'ScryfallRateLimitError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Thrown while the circuit breaker is open. Extends `ScryfallRateLimitError`
 * so existing back-off handling treats it as "skip Scryfall for now".
 */
export class ScryfallUnavailableError extends ScryfallRateLimitError {
  constructor(retryAfterMs: number) {
    super(retryAfterMs);
    this.name = 'ScryfallUnavailableError';
    this.message =
      `Scryfall circuit breaker open after ${CIRCUIT_FAILURE_THRESHOLD}+ ` +
      `failures; retry in ${Math.ceil(retryAfterMs / 1000)}s`;
  }
}

/** Milliseconds until the current Scryfall cool-off ends (0 when clear). */
export function scryfallCooldownRemainingMs(): number {
  return Math.max(0, cooldownUntil - Date.now());
}

/** Milliseconds left in the open circuit-breaker window (0 when closed). */
export function scryfallCircuitRemainingMs(): number {
  return Math.max(0, circuitOpenUntil - Date.now());
}

/**
 * True while Scryfall should not be called at all. Callers that have a
 * Scryfall-free path (e.g. the answer index) should take it instead of
 * paying a timeout per request.
 */
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
export function resetScryfallClientState(): void {
  nextRequestAllowedAt = 0;
  queueDepth = 0;
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
  if (!headers.has('User-Agent')) headers.set('User-Agent', SCRYFALL_USER_AGENT);
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  return { ...init, headers };
}

/** Waits for this request's slot in the ≥100ms pacing queue. */
async function acquireSlot(): Promise<void> {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextRequestAllowedAt, cooldownUntil);
  nextRequestAllowedAt = scheduledAt + MIN_REQUEST_INTERVAL_MS;
  const waitMs = scheduledAt - now;
  if (waitMs > 0) await sleep(waitMs);
}

export interface ScryfallFetchOptions extends RequestInit {
  /** Per-attempt timeout. Defaults to 8s. */
  timeoutMs?: number;
  /** Retries on 429/5xx/network failures. Defaults to 2. */
  retries?: number;
  /**
   * When true (default) a live cool-off makes the call fail fast instead of
   * queueing behind it. Background jobs can set false to wait it out.
   */
  failFastOnCooldown?: boolean;
}

/**
 * Paced, identified, back-off-aware fetch against api.scryfall.com.
 *
 * Throws `ScryfallRateLimitError` while a cool-off is active (fail-fast mode)
 * and on 429s that outlive the retry budget. 4xx responses other than 429 are
 * returned to the caller unchanged — they are query errors, not rate limits.
 *
 * After {@link CIRCUIT_FAILURE_THRESHOLD} consecutive failures the circuit
 * breaker opens: calls throw `ScryfallUnavailableError` immediately for
 * {@link CIRCUIT_OPEN_MS} without touching the network, then a single probe is
 * allowed through to close it again.
 */
export async function scryfallFetch(
  url: string,
  options: ScryfallFetchOptions = {},
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    retries = DEFAULT_RETRIES,
    failFastOnCooldown = true,
    ...init
  } = options;

  const circuitRemaining = scryfallCircuitRemainingMs();
  if (circuitRemaining > 0) {
    // Background jobs (failFastOnCooldown: false) wait the window out; every
    // user-facing caller skips Scryfall entirely and uses its fallback path.
    if (failFastOnCooldown) throw new ScryfallUnavailableError(circuitRemaining);
    await sleep(circuitRemaining);
  }

  const cooldown = scryfallCooldownRemainingMs();
  if (cooldown > 0 && failFastOnCooldown) {
    throw new ScryfallRateLimitError(cooldown);
  }
  if (queueDepth >= MAX_QUEUE_DEPTH) {
    throw new ScryfallRateLimitError(MIN_REQUEST_INTERVAL_MS * queueDepth);
  }

  // Half-open: the window elapsed but Scryfall has not answered successfully
  // yet, so let exactly one request probe the API instead of a thundering herd.
  let ownsProbe = false;
  if (consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
    if (probeInFlight) {
      if (failFastOnCooldown) throw new ScryfallUnavailableError(CIRCUIT_OPEN_MS);
    } else {
      probeInFlight = true;
      ownsProbe = true;
    }
  }

  queueDepth += 1;
  try {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      await acquireSlot();

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, {
          ...withScryfallHeaders(init),
          signal: controller.signal,
        });

        if (response.status === 429 || response.status === 503) {
          const retryAfterMs = parseRetryAfterMs(response);
          cooldownUntil = Math.max(cooldownUntil, Date.now() + retryAfterMs);
          void response.body?.cancel();
          if (attempt < retries && retryAfterMs <= timeoutMs) {
            await sleep(retryAfterMs);
            continue;
          }
          recordFailure();
          throw new ScryfallRateLimitError(retryAfterMs);
        }

        if (response.status >= 500 && attempt < retries) {
          void response.body?.cancel();
          await sleep(300 * (attempt + 1));
          continue;
        }

        if (response.status >= 500) recordFailure();
        else recordSuccess();
        return response;
      } catch (error) {
        if (error instanceof ScryfallRateLimitError) throw error;
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt >= retries) {
          recordFailure();
          throw lastError;
        }
        await sleep(300 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }

    recordFailure();
    throw lastError ?? new Error('Scryfall request failed');
  } finally {
    queueDepth = Math.max(0, queueDepth - 1);
    if (ownsProbe) probeInFlight = false;
  }
}


/** Convenience wrapper for `/cards/search`. */
export function scryfallSearch(
  query: string,
  params: Record<string, string> = {},
  options: ScryfallFetchOptions = {},
): Promise<Response> {
  const search = new URLSearchParams({ q: query, ...params });
  return scryfallFetch(
    `https://api.scryfall.com/cards/search?${search.toString()}`,
    options,
  );
}
