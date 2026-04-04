import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const select = vi.fn();
const order = vi.fn();
const limit = vi.fn();
const isFilter = vi.fn();
const update = vi.fn();
const eq = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: (...args: unknown[]) => {
        select(...args);
        return {
          order: (...orderArgs: unknown[]) => {
            order(...orderArgs);
            return {
              limit: (...limitArgs: unknown[]) => {
                limit(...limitArgs);
                return { is: (...isArgs: unknown[]) => isFilter(...isArgs) };
              },
            };
          },
        };
      },
      update: (...args: unknown[]) => {
        update(...args);
        return { eq: (...eqArgs: unknown[]) => eq(...eqArgs) };
      },
    })),
  },
}));
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { useTranslationRulesAdmin } from '@/hooks/useTranslationRulesAdmin';

describe('useTranslationRulesAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    limit.mockResolvedValue({
      data: [
        {
          id: 'rule-1',
          pattern: 'draw',
          scryfall_syntax: 'o:draw',
          confidence: 0.8,
          is_active: true,
          description: null,
          created_at: '2026-01-01T00:00:00.000Z',
          source_feedback_id: null,
          archived_at: null,
        },
      ],
      error: null,
    });
    isFilter.mockResolvedValue({
      data: [
        {
          id: 'rule-1',
          pattern: 'draw',
          scryfall_syntax: 'o:draw',
          confidence: 0.8,
          is_active: true,
          description: null,
          created_at: '2026-01-01T00:00:00.000Z',
          source_feedback_id: null,
          archived_at: null,
        },
      ],
      error: null,
    });
    eq.mockResolvedValue({ error: null });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue({
          status: 200,
          json: async () => ({ total_cards: 123 }),
        }),
    );
  });

  it('loads and toggles rule state', async () => {
    const { result } = renderHook(() =>
      useTranslationRulesAdmin({ enabled: true }),
    );

    await waitFor(() => expect(result.current.rules.length).toBe(1));

    await act(async () => {
      await result.current.toggleRuleDirect('rule-1', true);
    });

    expect(update).toHaveBeenCalled();
  });

  it('validates and saves syntax', async () => {
    const onRulePatched = vi.fn();
    const { result } = renderHook(() =>
      useTranslationRulesAdmin({ enabled: true, onRulePatched }),
    );

    await waitFor(() => expect(result.current.rules.length).toBe(1));

    await act(async () => {
      const saved = await result.current.validateAndSaveRuleSyntax(
        'rule-1',
        'o:draw c:g',
      );
      expect(saved).toBe(true);
    });

    expect(onRulePatched).toHaveBeenCalledWith('rule-1', {
      scryfall_syntax: 'o:draw c:g',
    });
  });
});
