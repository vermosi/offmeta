import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/core/logger';

const MAX_RETRIES = 3;
const DEFAULT_RETRY_AFTER_MS = 1000;
const MAX_RETRY_AFTER_MS = 10_000;

export interface ComboSearchOptions {
  /** Max number of retries after a 429 response. Defaults to 3. */
  maxRetries?: number;
  /** Called before each wait, with the delay in ms and the attempt number (1-based). */
  onRetry?: (delayMs: number, attempt: number) => void;
  signal?: AbortSignal;
}

interface RateLimitInfo {
  isRateLimited: boolean;
  retryAfterMs: number;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Aborted'));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new Error('Aborted'));
      },
      { once: true },
    );
  });

const clampDelay = (seconds: unknown): number => {
  const value = typeof seconds === 'number' ? seconds : Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_RETRY_AFTER_MS;
  return Math.min(value * 1000, MAX_RETRY_AFTER_MS);
};

/**
 * Detects a 429 rate-limit response from a Supabase Functions error and
 * extracts the server-provided `retryAfter` value (seconds).
 */
async function readRateLimit(error: unknown): Promise<RateLimitInfo> {
  const response = (error as { context?: Response } | null)?.context;
  if (!response || typeof response !== 'object' || response.status !== 429) {
    return { isRateLimited: false, retryAfterMs: 0 };
  }

  let retryAfterMs = clampDelay(response.headers?.get?.('retry-after'));
  try {
    const body = await response.clone().json();
    if (body?.retryAfter !== undefined) retryAfterMs = clampDelay(body.retryAfter);
  } catch {
    // Body unreadable — fall back to the header/default delay.
  }
  return { isRateLimited: true, retryAfterMs };
}

/** Minimum spacing between outbound combo-search requests. */
const MIN_REQUEST_INTERVAL_MS = 500;
/** How long an identical response stays reusable. */
const CACHE_TTL_MS = 120_000;
const MAX_CACHE_ENTRIES = 50;

const inFlight = new Map<string, Promise<unknown>>();
const cache = new Map<string, { value: unknown; expiresAt: number }>();
let lastRequestAt = 0;
let throttleChain: Promise<void> = Promise.resolve();

/** Normalises a value so equivalent params produce an identical cache key. */
function normalizeParam(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeParam(item))
      .filter((item) => item !== undefined && item !== null && item !== "")
      .map((item) => (typeof item === "string" ? item.trim().toLowerCase() : item))
      .sort((a, b) => String(a).localeCompare(String(b)));
  }
  if (typeof value === "string") return value.trim().toLowerCase();
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, normalizeParam(v)]),
    );
  }
  return value;
}

/** Builds a stable cache key from the request parameters (order-insensitive). */
export const comboSearchCacheKey = (body: Record<string, unknown>) =>
  JSON.stringify(normalizeParam(body));

const cacheKey = comboSearchCacheKey;


/** Serialises requests so no two calls leave within MIN_REQUEST_INTERVAL_MS. */
function throttleSlot(): Promise<void> {
  const next = throttleChain.then(async () => {
    const wait = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
  });
  throttleChain = next.catch(() => undefined);
  return next;
}

function readCache<T>(key: string): T | undefined {
  const hit = cache.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt < Date.now()) {
    cache.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function writeCache(key: string, value: unknown): void {
  if (cache.size >= MAX_CACHE_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Clears cached combo-search responses (used by tests and manual refresh). */
export function clearComboSearchCache(): void {
  cache.clear();
  inFlight.clear();
}

async function requestComboSearch<T>(
  body: Record<string, unknown>,
  options: ComboSearchOptions,
): Promise<T> {
  const { maxRetries = MAX_RETRIES, onRetry, signal } = options;

  for (let attempt = 0; ; attempt += 1) {
    await throttleSlot();
    const { data, error } = await supabase.functions.invoke('combo-search', { body });

    if (!error) {
      if ((data as { error?: string } | null)?.error) {
        throw new Error((data as { error: string }).error);
      }
      return data as T;
    }

    const { isRateLimited, retryAfterMs } = await readRateLimit(error);
    if (!isRateLimited || attempt >= maxRetries) throw error;

    logger.warn('combo-search rate limited, retrying', { attempt: attempt + 1, retryAfterMs });
    onRetry?.(retryAfterMs, attempt + 1);
    await sleep(retryAfterMs, signal);
  }
}

/**
 * Invokes the `combo-search` edge function with:
 * - retries that honour the server's 429 `retryAfter` value
 * - de-duplication of identical concurrent requests
 * - a short-lived response cache
 * - client-side throttling between outbound calls
 */
export function invokeComboSearch<T>(
  body: Record<string, unknown>,
  options: ComboSearchOptions = {},
): Promise<T> {
  const key = cacheKey(body);

  const cached = readCache<T>(key);
  if (cached !== undefined) return Promise.resolve(cached);

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const promise = requestComboSearch<T>(body, options)
    .then((value) => {
      writeCache(key, value);
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

