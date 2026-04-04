import { renderHook } from '@testing-library/react';
import { useAdminAnalyticsFilters } from '@/hooks/useAdminAnalyticsFilters';
import type {
  FeedbackItem,
  TranslationRuleRow,
} from '@/pages/admin-analytics/types';

const feedback = [
  { id: '1', processing_status: 'pending' },
  { id: '2', processing_status: 'completed' },
  { id: '3', processing_status: 'updated_existing' },
  { id: '4', processing_status: 'archived' },
] as FeedbackItem[];

const rules = [
  {
    id: 'a',
    is_active: true,
    archived_at: null,
    pattern: 'draw',
    scryfall_syntax: 'o:draw',
    description: 'cards',
  },
  {
    id: 'b',
    is_active: false,
    archived_at: null,
    pattern: 'ramp',
    scryfall_syntax: 'o:add',
    description: null,
  },
  {
    id: 'c',
    is_active: true,
    archived_at: '2025-01-01T00:00:00.000Z',
    pattern: 'grave',
    scryfall_syntax: 'o:graveyard',
    description: 'graveyard',
  },
] as TranslationRuleRow[];

describe('useAdminAnalyticsFilters', () => {
  it('computes pending and archived counts', () => {
    const { result } = renderHook(() =>
      useAdminAnalyticsFilters({
        feedback,
        feedbackFilter: 'all',
        rules,
        rulesFilter: 'all',
        rulesSearch: '',
      }),
    );

    expect(result.current.pendingFeedbackCount).toBe(1);
    expect(result.current.archivedFeedbackCount).toBe(1);
    expect(result.current.activeRulesCount).toBe(1);
    expect(result.current.nonArchivedRulesCount).toBe(2);
    expect(result.current.archivedRulesCount).toBe(1);
  });

  it('includes updated_existing inside completed feedback filter', () => {
    const { result } = renderHook(() =>
      useAdminAnalyticsFilters({
        feedback,
        feedbackFilter: 'completed',
        rules,
        rulesFilter: 'all',
        rulesSearch: '',
      }),
    );

    expect(result.current.filteredFeedback.map((item) => item.id)).toEqual([
      '2',
      '3',
    ]);
  });

  it('applies rule status and search filtering', () => {
    const { result } = renderHook(() =>
      useAdminAnalyticsFilters({
        feedback,
        feedbackFilter: 'all',
        rules,
        rulesFilter: 'inactive',
        rulesSearch: 'add',
      }),
    );

    expect(result.current.filteredRules.map((rule) => rule.id)).toEqual(['b']);
  });
});
