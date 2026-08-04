import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: mockRpc,
  },
}));

import { classifyClientError, reportClientError } from './reportError';

describe('reportError', () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    mockRpc.mockReset();
    vi.stubGlobal('window', {
      location: {
        origin: 'https://offmeta.app',
        pathname: '/search',
      },
    });
    vi.stubGlobal('document', {
      referrer: 'https://google.com',
    });
    vi.stubGlobal('navigator', {
      userAgent: 'test-agent/1.0',
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'window', {
      value: originalWindow,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'document', {
      value: originalDocument,
      configurable: true,
    });
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
    });
  });

  it('classifies common client errors', () => {
    expect(classifyClientError('ChunkLoadError: loading chunk failed')).toBe(
      'chunk_load_failed',
    );
    expect(classifyClientError('Failed to fetch')).toBe('network_failure');
    expect(classifyClientError('scryfall request timed out')).toBe(
      'scryfall_request_failed',
    );
    expect(classifyClientError('supabase edge function failed')).toBe(
      'backend_request_failed',
    );
    expect(classifyClientError('something else')).toBe('unhandled_exception');
  });

  it('trims messages and reports once with browser context', async () => {
    await reportClientError({
      errorType: 'network_failure',
      message: '  request failed  ',
      severity: 'warning',
      context: { route: '/search' },
    });

    expect(mockRpc).toHaveBeenCalledWith('report_error_event', {
      p_source: 'client',
      p_error_type: 'network_failure',
      p_message: 'request failed',
      p_url: 'https://offmeta.app/search',
      p_severity: 'warning',
      p_context: {
        route: '/search',
        user_agent: 'test-agent/1.0',
        referrer: 'https://google.com',
      },
    });
  });

  it('skips empty messages', async () => {
    await reportClientError({
      errorType: 'network_failure',
      message: '   ',
    });

    expect(mockRpc).not.toHaveBeenCalled();
  });
});
