import { describe, expect, it } from 'vitest';
import {
  patchFeedbackRuleSyntax,
  removeArchivedRule,
  toggleRuleActiveInFeedback,
  toggleRuleActiveInRules,
  updateRuleArchivedAt,
} from './admin-analytics-optimistic';

describe('admin analytics optimistic helpers', () => {
  it('updates archived_at for a matching rule', () => {
    const rules = [
      { id: '1', archived_at: null, is_active: true } as never,
      { id: '2', archived_at: null, is_active: false } as never,
    ];
    const next = updateRuleArchivedAt(rules, '2', '2026-01-01T00:00:00.000Z');
    expect(next[1].archived_at).toBe('2026-01-01T00:00:00.000Z');
    expect(next[0].archived_at).toBeNull();
  });

  it('removes an archived rule from the list', () => {
    const rules = [
      { id: '1' } as never,
      { id: '2' } as never,
    ];
    expect(removeArchivedRule(rules, '1')).toHaveLength(1);
    expect(removeArchivedRule(rules, '1')[0].id).toBe('2');
  });

  it('toggles rule activity in rules and feedback views', () => {
    const rules = [
      { id: '1', is_active: true } as never,
      { id: '2', is_active: false } as never,
    ];
    const feedback = [
      {
        id: 'f1',
        generated_rule_id: '2',
        translation_rules: { is_active: false, scryfall_syntax: 'old' },
      } as never,
    ];

    expect(toggleRuleActiveInRules(rules, '2', true)[1].is_active).toBe(true);
    expect(toggleRuleActiveInFeedback(feedback, '2', true)[0].translation_rules?.is_active).toBe(true);
  });

  it('patches feedback rule syntax', () => {
    const feedback = [
      {
        id: 'f1',
        generated_rule_id: '2',
        translation_rules: { is_active: false, scryfall_syntax: 'old' },
      } as never,
    ];

    expect(patchFeedbackRuleSyntax(feedback, '2', 'new-syntax')[0].translation_rules?.scryfall_syntax).toBe('new-syntax');
  });
});
