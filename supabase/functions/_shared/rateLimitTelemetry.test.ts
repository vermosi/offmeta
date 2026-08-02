import { describe, expect, it, beforeEach, vi } from 'vitest';

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

describe('rateLimitedResponse', () => {
  beforeEach(() => {
    resetRateLimitMetrics();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns 429 with Retry-After and reason headers', async () => {
    const res = rateLimitedResponse('combo-search', makeReq(), 'ip:1.2.3.4', {
      statusCode: 429,
      retryAfter: 3,
      reason: 'bucket_limit',
      backend: 'memory',
      limit: 20,
    });

    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBe('3');
    expect(res.headers.get('X-RateLimit-Reason')).toBe('bucket_limit');
    await expect(res.json()).resolves.toMatchObject({
      reason: 'bucket_limit',
      retryAfter: 3,
    });
  });

  it('logs a structured rate_limit_rejected event', () => {
    rateLimitedResponse('combo-search', makeReq(), 'ip:1.2.3.4', {
      reason: 'global_limit',
    });

    const [line] = (console.warn as unknown as { mock: { calls: string[][] } })
      .mock.calls[0];
    const parsed = JSON.parse(line);
    expect(parsed).toMatchObject({
      event: 'rate_limit_rejected',
      scope: 'combo-search',
      reason: 'global_limit',
      status: 429,
      requestId: 'req-123',
    });
  });

  it('counts rejections per scope and reason', () => {
    rateLimitedResponse('combo-search', makeReq(), 'ip:1.2.3.4', {
      reason: 'bucket_limit',
    });
    rateLimitedResponse('combo-search', makeReq(), 'ip:1.2.3.4', {
      reason: 'bucket_limit',
    });
    rateLimitedResponse('semantic-search', makeReq(), 'session:abc', {
      reason: 'session_limit',
    });

    const metrics = getRateLimitMetrics();
    expect(metrics).toHaveLength(2);
    expect(
      metrics.find((m) => m.scope === 'combo-search')?.count,
    ).toBe(2);
    expect(
      metrics.find((m) => m.reason === 'session_limit')?.count,
    ).toBe(1);
  });

  it('uses 503 messaging for limiter errors', async () => {
    const res = rateLimitedResponse('process-feedback', makeReq(), 'ip:x', {
      statusCode: 503,
      reason: 'limiter_error',
    });
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      reason: 'limiter_error',
    });
  });
});
