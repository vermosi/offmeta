import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const select = vi.fn();
const order = vi.fn();
const limit = vi.fn();
const update = vi.fn();
const eq = vi.fn();
const getSession = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args: unknown[]) => {
        select(...args);
        return {
          order: (...orderArgs: unknown[]) => {
            order(...orderArgs);
            return { limit: (...limitArgs: unknown[]) => limit(...limitArgs) };
          },
        };
      },
      update: (...args: unknown[]) => {
        update(...args);
        return { eq: (...eqArgs: unknown[]) => eq(...eqArgs) };
      },
    })),
    auth: { getSession: () => getSession() },
  },
}));
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/core/logger', () => ({ logger: { error: vi.fn() } }));

import { useFeedbackQueue } from '@/hooks/useFeedbackQueue';

describe('useFeedbackQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_PUBLISHABLE_KEY', 'pk_test');

    limit.mockResolvedValue({
      data: [
        {
          id: 'f-1',
          original_query: 'query',
          translated_query: 't:q',
          issue_description: 'issue',
          processing_status: 'failed',
          created_at: '2026-01-01T00:00:00.000Z',
          processed_at: null,
          generated_rule_id: 'rule-1',
          scryfall_validation_count: 1,
          translation_rules: {
            pattern: 'p',
            scryfall_syntax: 's',
            confidence: 0.9,
            is_active: true,
            description: null,
          },
        },
      ],
      error: null,
    });
    eq.mockResolvedValue({ error: null });
    getSession.mockResolvedValue({
      data: { session: { access_token: 'token' } },
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          json: async () => ({ status: 'done' }),
        }),
    );
  });

  it('loads and filters feedback', async () => {
    const { result } = renderHook(() => useFeedbackQueue({ enabled: true }));

    await waitFor(() => expect(result.current.feedback.length).toBe(1));
    expect(result.current.filteredFeedback.length).toBe(1);

    act(() => {
      result.current.setFeedbackFilter('failed');
    });
    expect(result.current.filteredFeedback.length).toBe(1);
  });

  it('optimistically toggles linked rule', async () => {
    const onRulePatched = vi.fn();
    const { result } = renderHook(() =>
      useFeedbackQueue({ enabled: true, onRulePatched }),
    );

    await waitFor(() => expect(result.current.feedback.length).toBe(1));

    await act(async () => {
      await result.current.toggleRuleActive('f-1', 'rule-1', true);
    });

    expect(onRulePatched).toHaveBeenCalledWith('rule-1', { is_active: false });
    expect(update).toHaveBeenCalled();
  });
});
