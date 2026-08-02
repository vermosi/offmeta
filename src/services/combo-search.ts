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

/**
 * Invokes the `combo-search` edge function, retrying automatically when the
 * server responds with 429 and honouring its `retryAfter` value.
 */
export async function invokeComboSearch<T>(
  body: Record<string, unknown>,
  options: ComboSearchOptions = {},
): Promise<T> {
  const { maxRetries = MAX_RETRIES, onRetry, signal } = options;

  for (let attempt = 0; ; attempt += 1) {
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
