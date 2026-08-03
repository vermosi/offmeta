# src\lib\regression\rate-limiting.test.ts

- RateLimitEntry · interface · L16-L19 — interface RateLimitEntry
- checkSessionRateLimit · function · L25-L49 — function checkSessionRateLimit( sessionId: string | null, windowMs: number = SESSION_WINDOW_MS, limit: number = SESSION_LIMIT, ): { allowed: boolean; retryAfter?: number }
