import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimiter = new Map<string, RateLimitEntry>();
const sessionLimiter = new Map<string, RateLimitEntry>();
let globalRequestCount = 0;
let globalResetTime = Date.now() + 60000;

// Session rate limiting: stricter limits per session to prevent abuse loops
const SESSION_LIMIT = 20; // 20 requests per minute per session
const SESSION_WINDOW_MS = 60000;

/**
 * Check session-level rate limit
 */
export function checkSessionRateLimit(
  sessionId: string | null,
  windowMs: number = SESSION_WINDOW_MS,
  limit: number = SESSION_LIMIT,
): { allowed: boolean; retryAfter?: number } {
  if (!sessionId) return { allowed: true };

  const now = Date.now();
  const entry = sessionLimiter.get(sessionId);

  if (!entry || now > entry.resetTime) {
    sessionLimiter.set(sessionId, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Checks rate limits. Defaults to in-memory, upgrades to distributed if Supabase client is provided.
 */
export async function checkRateLimit(
  ip: string,
  supabase?: SupabaseClient,
  ipLimit: number = 30,
  globalLimit: number = 1000,
  windowMs: number = 60000,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    // 1. Check Global Limit (In-Memory is fine for this to save DB)
    const now = Date.now();
    if (now > globalResetTime) {
      globalRequestCount = 0;
      globalResetTime = now + windowMs;
    }

    if (globalRequestCount >= globalLimit) {
      return {
        allowed: false,
        retryAfter: Math.ceil((globalResetTime - now) / 1000),
      };
    }
    globalRequestCount++;

    // 2. Distributed Rate Limit (if client provided)
    if (supabase) {
      // Simple implementation: Count recent requests
      // Note: Ideal production implementation uses Redis or a dedicated count table with upsert
      // This implementation assumes a log/event based table or similar

      // Upsert into rate_limits table
      const { data, error } = await supabase.rpc('increment_rate_limit', {
        client_ip: ip,
        limit_count: ipLimit,
        window_seconds: windowMs / 1000,
      });

      if (!error && data) {
        if (data.blocked) {
          return { allowed: false, retryAfter: data.retry_after };
        }
        return { allowed: true };
      }

      // Fallback to table query if RPC not exists or fails
      // This requires the rate_limits table to exist
      try {
        const { data: limitData, error: limitError } = await supabase
          .from('rate_limits')
          .select('count, window_start')
          .eq('ip', ip)
          .single();

        if (!limitError && limitData) {
          const windowStartedAt = new Date(limitData.window_start).getTime();
          if (now - windowStartedAt < windowMs) {
            if (limitData.count >= ipLimit) {
              return {
                allowed: false,
                retryAfter: Math.ceil(
                  (windowStartedAt + windowMs - now) / 1000,
                ),
              };
            }
            // Increment
            await supabase
              .from('rate_limits')
              .update({ count: limitData.count + 1 })
              .eq('ip', ip);
            return { allowed: true };
          } else {
            // Reset
            await supabase
              .from('rate_limits')
              .update({ count: 1, window_start: new Date().toISOString() })
              .eq('ip', ip);
            return { allowed: true };
          }
        } else {
          // Insert new
          await supabase
            .from('rate_limits')
            .insert({ ip, count: 1, window_start: new Date().toISOString() });
          return { allowed: true };
        }
      } catch (e) {
        console.warn(
          'Distributed rate limit failed, falling back to memory',
          e,
        );
      }
    }

    // 3. In-Memory Fallback
    const entry = rateLimiter.get(ip);
    if (!entry || now > entry.resetTime) {
      rateLimiter.set(ip, { count: 1, resetTime: now + windowMs });
      return { allowed: true };
    }

    if (entry.count >= ipLimit) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    entry.count++;
    return { allowed: true };
  } catch (e) {
    console.error('Rate limit error:', e);
    // Fail open if rate limit checking errors out seriously
    return { allowed: true };
  }
}

// Clean up old in-memory rate limit entries periodically
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimiter.entries()) {
    if (now > entry.resetTime) {
      rateLimiter.delete(ip);
    }
  }
  // Also clean up session limiter
  for (const [sessionId, entry] of sessionLimiter.entries()) {
    if (now > entry.resetTime) {
      sessionLimiter.delete(sessionId);
    }
  }
}, 60000);

export function cleanupRateLimiter() {
  clearInterval(cleanupInterval);
  rateLimiter.clear();
  sessionLimiter.clear();
}
