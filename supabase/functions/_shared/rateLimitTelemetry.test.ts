import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import {
  getRateLimitMetrics,
  rateLimitedResponse,
  resetRateLimitMetrics,
} from './rateLimitTelemetry.ts';

const makeReq = () =>
  new Request('https://edge.test/combo-search', {
    method: 'POST',
    headers: { 'x-request-id': 'req-123' },
  });

function captureWarn(fn: () => void): string[] {
  const original = console.warn;
  const lines: string[] = [];
  console.warn = (line: unknown) => lines.push(String(line));
  try {
    fn();
  } finally {
    console.warn = original;
  }
  return lines;
}

Deno.test('rate limited response carries retry and reason metadata', async () => {
  resetRateLimitMetrics();
  let res!: Response;
  captureWarn(() => {
    res = rateLimitedResponse('combo-search', makeReq(), 'ip:1.2.3.4', {
      statusCode: 429,
      retryAfter: 3,
      reason: 'bucket_limit',
      backend: 'memory',
      limit: 20,
    });
  });

  assertEquals(res.status, 429);
  assertEquals(res.headers.get('Retry-After'), '3');
  assertEquals(res.headers.get('X-RateLimit-Reason'), 'bucket_limit');
  const body = await res.json();
  assertEquals(body.reason, 'bucket_limit');
  assertEquals(body.retryAfter, 3);
});

Deno.test('rate limited response emits a structured log line', async () => {
  resetRateLimitMetrics();
  let res!: Response;
  const lines = captureWarn(() => {
    res = rateLimitedResponse('combo-search', makeReq(), 'ip:1.2.3.4', {
      reason: 'global_limit',
    });
  });
  await res.body?.cancel();

  const parsed = JSON.parse(lines[0]);
  assertEquals(parsed.event, 'rate_limit_rejected');
  assertEquals(parsed.scope, 'combo-search');
  assertEquals(parsed.reason, 'global_limit');
  assertEquals(parsed.status, 429);
  assertEquals(parsed.requestId, 'req-123');
});

Deno.test('rejections are counted per scope and reason', async () => {
  resetRateLimitMetrics();
  const responses: Response[] = [];
  captureWarn(() => {
    responses.push(
      rateLimitedResponse('combo-search', makeReq(), 'ip:1.2.3.4', {
        reason: 'bucket_limit',
      }),
      rateLimitedResponse('combo-search', makeReq(), 'ip:1.2.3.4', {
        reason: 'bucket_limit',
      }),
      rateLimitedResponse('semantic-search', makeReq(), 'session:abc', {
        reason: 'session_limit',
      }),
    );
  });
  for (const res of responses) await res.body?.cancel();

  const metrics = getRateLimitMetrics();
  assertEquals(metrics.length, 2);
  assertEquals(metrics.find((m) => m.scope === 'combo-search')?.count, 2);
  assertEquals(metrics.find((m) => m.reason === 'session_limit')?.count, 1);
});

Deno.test('limiter errors surface as 503 with reason', async () => {
  resetRateLimitMetrics();
  let res!: Response;
  captureWarn(() => {
    res = rateLimitedResponse('process-feedback', makeReq(), 'ip:x', {
      statusCode: 503,
      reason: 'limiter_error',
    });
  });

  assertEquals(res.status, 503);
  const body = await res.json();
  assertEquals(body.reason, 'limiter_error');
});
