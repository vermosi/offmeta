import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { checkRateLimit, cleanupRateLimiter } from './rateLimit.ts';

Deno.test('rate limit defaults to fail closed when an internal error occurs', async () => {
  cleanupRateLimiter();

  const explodingSupabase = {
    rpc: () => {
      throw new Error('boom');
    },
    from: () => {
      throw new Error('boom');
    },
  };

  const result = await checkRateLimit(
    'bucket-1',
    explodingSupabase as never,
    5,
    10,
    60000,
  );

  assertEquals(result.allowed, false);
  assertEquals(result.statusCode, 503);
});
