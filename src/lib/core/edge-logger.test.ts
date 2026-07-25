import { describe, expect, it, vi } from 'vitest';
import {
  formatError,
  withLogging,
} from '../../../supabase/functions/_shared/logger.ts';

describe('edge logger', () => {
  it('serializes circular metadata without throwing', () => {
    const circular: Record<string, unknown> = { label: 'loop' };
    circular.self = circular;

    expect(() => formatError(circular)).not.toThrow();
    expect(formatError(circular)).toMatchObject({
      error_message: expect.stringContaining('loop'),
    });
  });

  it('wraps requests and returns request ids', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = withLogging('test-scope', async () => new Response('ok'));

    const res = await handler(
      new Request('https://example.com/test', {
        headers: { 'x-request-id': 'abc123' },
      }),
    );

    expect(res.status).toBe(200);
    expect(res.headers.get('x-request-id')).toBe('abc123');

    errorSpy.mockRestore();
  });
});
