import { useMemo } from 'react';
import type {
  FeedbackFilter,
  FeedbackItem,
  RulesFilter,
  TranslationRuleRow,
} from '@/pages/admin-analytics/types';

interface UseAdminAnalyticsFiltersInput {
  feedback: FeedbackItem[];
  feedbackFilter: FeedbackFilter;
  rules: TranslationRuleRow[];
  rulesFilter: RulesFilter;
  rulesSearch: string;
}

export function useAdminAnalyticsFilters({
  feedback,
  feedbackFilter,
  rules,
  rulesFilter,
  rulesSearch,
}: UseAdminAnalyticsFiltersInput) {
  const pendingFeedbackCount = useMemo(
    () =>
      feedback.filter(
        (item) =>
          item.processing_status === 'pending' ||
          item.processing_status == null,
      ).length,
    [feedback],
  );

  const archivedFeedbackCount = useMemo(
    () =>
      feedback.filter((item) => item.processing_status === 'archived').length,
    [feedback],
  );

  const filteredFeedback = useMemo(
    () =>
      feedback.filter((item) => {
        const status = item.processing_status ?? 'pending';
        if (feedbackFilter === 'all') return true;
        if (feedbackFilter === 'completed') {
          return (
            status === 'completed' ||
            status === 'updated_existing' ||
            status === 'done'
          );
        }
        return status === feedbackFilter;
      }),
    [feedback, feedbackFilter],
  );

  const rulesSearchQuery = rulesSearch.trim().toLowerCase();

  const filteredRules = useMemo(
    () =>
      rules.filter((rule) => {
        const matchesFilter =
          rulesFilter === 'all' ||
          (rulesFilter === 'active' && rule.is_active) ||
          (rulesFilter === 'inactive' && !rule.is_active);

        const matchesSearch =
          !rulesSearchQuery ||
          rule.pattern.toLowerCase().includes(rulesSearchQuery) ||
          rule.scryfall_syntax.toLowerCase().includes(rulesSearchQuery) ||
          (rule.description ?? '').toLowerCase().includes(rulesSearchQuery);

        return matchesFilter && matchesSearch;
      }),
    [rules, rulesFilter, rulesSearchQuery],
  );

  const activeRulesCount = useMemo(
    () => rules.filter((rule) => rule.is_active && !rule.archived_at).length,
    [rules],
  );

  const nonArchivedRulesCount = useMemo(
    () => rules.filter((rule) => !rule.archived_at).length,
    [rules],
  );

  const archivedRulesCount = useMemo(
    () => rules.filter((rule) => Boolean(rule.archived_at)).length,
    [rules],
  );

  return {
    pendingFeedbackCount,
    archivedFeedbackCount,
    filteredFeedback,
    filteredRules,
    activeRulesCount,
    nonArchivedRulesCount,
    archivedRulesCount,
  };
}
