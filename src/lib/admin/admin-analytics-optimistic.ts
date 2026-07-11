import type { FeedbackItem, TranslationRuleRow } from '@/pages/admin-analytics/types';

export function updateRuleArchivedAt(
  rules: TranslationRuleRow[],
  ruleId: string,
  archivedAt: string | null,
): TranslationRuleRow[] {
  return rules.map((rule) =>
    rule.id === ruleId ? { ...rule, archived_at: archivedAt } : rule,
  );
}

export function removeArchivedRule(
  rules: TranslationRuleRow[],
  ruleId: string,
): TranslationRuleRow[] {
  return rules.filter((rule) => rule.id !== ruleId);
}

export function toggleRuleActiveInRules(
  rules: TranslationRuleRow[],
  ruleId: string,
  isActive: boolean,
): TranslationRuleRow[] {
  return rules.map((rule) =>
    rule.id === ruleId ? { ...rule, is_active: isActive } : rule,
  );
}

export function toggleRuleActiveInFeedback(
  feedback: FeedbackItem[],
  ruleId: string,
  isActive: boolean,
): FeedbackItem[] {
  return feedback.map((item) =>
    item.generated_rule_id === ruleId && item.translation_rules
      ? {
          ...item,
          translation_rules: {
            ...item.translation_rules,
            is_active: isActive,
          },
        }
      : item,
  );
}

export function patchFeedbackRuleSyntax(
  feedback: FeedbackItem[],
  ruleId: string,
  scryfallSyntax: string,
): FeedbackItem[] {
  return feedback.map((item) =>
    item.generated_rule_id === ruleId && item.translation_rules
      ? {
          ...item,
          translation_rules: {
            ...item.translation_rules,
            scryfall_syntax: scryfallSyntax,
          },
        }
      : item,
  );
}
