// Minimal type for Supabase client to avoid deep type instantiation
type SupabaseClientLike = {
  rpc: (
    fn: string,
    params: Record<string, unknown>,
  ) => PromiseLike<{
    data: { blocked?: boolean; retry_after?: number } | null;
    error: unknown;
  }>;
  from: (table: 'rate_limits') => RateLimitTableQueryBuilder;
};

type QueryResult<TData> = PromiseLike<{
  data: TData | null;
  error: unknown;
}>;

type RateLimitRow = {
  count: number;
  window_start: string;
};

type RateLimitFilterQueryBuilder = {
  eq: (column: 'ip', value: string) => QueryResult<RateLimitRow>;
};

type RateLimitTableQueryBuilder = {
  select: (columns: 'count, window_start') => {
    eq: (
      column: 'ip',
      value: string,
    ) => {
      single: () => QueryResult<RateLimitRow>;
    };
  };
  update: (values: {
    count: number;
    window_start?: string;
  }) => RateLimitFilterQueryBuilder;
  insert: (values: {
    ip: string;
    count: number;
    window_start: string;
  }) => PromiseLike<unknown>;
};

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  failOpen?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfter?: number;
  statusCode?: 429 | 503;
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

const TRUSTED_IP_HEADER_KEYS = [
  'cf-connecting-ip',
  'x-real-ip',
  'fly-client-ip',
];
const CONSTRAINED_UNKNOWN_KEY = 'constrained:unknown';

function isValidIp(value: string): boolean {
  const candidate = value.trim();
  if (!candidate) return false;

  const ipv4Pattern =
    /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
  const ipv6Pattern = /^([0-9a-f]{1,4}:){1,7}[0-9a-f]{1,4}$/i;

  return ipv4Pattern.test(candidate) || ipv6Pattern.test(candidate);
}

function decodeBase64Url(input: string): string | null {
  try {
    const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return atob(padded);
  } catch {
    return null;
  }
}

function getStablePrincipal(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  const sessionId = req.headers.get('x-session-id')?.trim();

  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const jwtParts = token.split('.');
    if (jwtParts.length === 3) {
      const payload = decodeBase64Url(jwtParts[1]);
      if (payload) {
        try {
          const parsed = JSON.parse(payload) as {
            sub?: string;
            session_id?: string;
            role?: string;
          };
          if (parsed.sub) return `sub:${parsed.sub}`;
          if (parsed.session_id) return `session:${parsed.session_id}`;
          if (parsed.role) return `role:${parsed.role}`;
        } catch {
          // ignore parse failures and continue with non-JWT token fallback
        }
      }
    }

    if (token.length > 0) {
      return `token:${token}`;
    }
  }

  return sessionId ? `session:${sessionId}` : null;
}

async function hashValue(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export async function resolveRateLimitKey(req: Request): Promise<string> {
  for (const headerKey of TRUSTED_IP_HEADER_KEYS) {
    const trustedIp = req.headers.get(headerKey)?.trim();
    if (trustedIp && isValidIp(trustedIp)) {
      return `ip:${trustedIp}`;
    }
  }

  const principal = getStablePrincipal(req);
  if (principal) {
    return `principal:${await hashValue(principal)}`;
  }

  return CONSTRAINED_UNKNOWN_KEY;
}

/**
 * Checks rate limits. Defaults to in-memory, upgrades to distributed if Supabase client is provided.
 */
export async function checkRateLimit(
  bucketKey: string,
  supabase?: SupabaseClientLike,
  ipLimit: number = 30,
  globalLimit: number = 1000,
  windowMs: number = 60000,
  options?: RateLimitOptions,
): Promise<RateLimitResult> {
  const shouldFailOpen = options?.failOpen ?? true;
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
        statusCode: 429,
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
        client_ip: bucketKey,
        limit_count: ipLimit,
        window_seconds: windowMs / 1000,
      });

      if (!error && data) {
        if (data.blocked) {
          return {
            allowed: false,
            retryAfter: data.retry_after,
            statusCode: 429,
          };
        }
        return { allowed: true };
      }

      // Fallback to table query if RPC not exists or fails
      // This requires the rate_limits table to exist
      try {
        const { data: limitData, error: limitError } = await supabase
          .from('rate_limits')
          .select('count, window_start')
          .eq('ip', bucketKey)
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
                statusCode: 429,
              };
            }
            // Increment
            await supabase
              .from('rate_limits')
              .update({ count: limitData.count + 1 })
              .eq('ip', bucketKey);
            return { allowed: true };
          } else {
            // Reset
            await supabase
              .from('rate_limits')
              .update({ count: 1, window_start: new Date().toISOString() })
              .eq('ip', bucketKey);
            return { allowed: true };
          }
        } else {
          // Insert new
          await supabase.from('rate_limits').insert({
            ip: bucketKey,
            count: 1,
            window_start: new Date().toISOString(),
          });
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
    const entry = rateLimiter.get(bucketKey);
    if (!entry || now > entry.resetTime) {
      rateLimiter.set(bucketKey, { count: 1, resetTime: now + windowMs });
      return { allowed: true };
    }

    if (entry.count >= ipLimit) {
      return {
        allowed: false,
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        statusCode: 429,
      };
    }

    entry.count++;
    return { allowed: true };
  } catch (e) {
    console.error('Rate limit error:', e);
    if (shouldFailOpen) {
      return { allowed: true };
    }
    return { allowed: false, retryAfter: 1, statusCode: 503 };
  }
}

/**
 * Cleanup expired entries on access (serverless-safe alternative to setInterval).
 * Call this periodically or before rate limit checks.
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [ip, entry] of rateLimiter.entries()) {
    if (now > entry.resetTime) {
      rateLimiter.delete(ip);
    }
  }
  for (const [sessionId, entry] of sessionLimiter.entries()) {
    if (now > entry.resetTime) {
      sessionLimiter.delete(sessionId);
    }
  }
}

// Cleanup counter - run cleanup every N accesses to avoid overhead on every call
let cleanupCounter = 0;
const CLEANUP_INTERVAL = 100; // Run cleanup every 100 accesses

/**
 * Trigger cleanup if enough accesses have occurred.
 * This is serverless-safe as it doesn't rely on setInterval.
 */
export function maybeCleanup(): void {
  cleanupCounter++;
  if (cleanupCounter >= CLEANUP_INTERVAL) {
    cleanupCounter = 0;
    cleanupExpiredEntries();
  }
}

export function cleanupRateLimiter(): void {
  rateLimiter.clear();
  sessionLimiter.clear();
  cleanupCounter = 0;
}
