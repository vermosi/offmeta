# src\lib\admin\admin-analytics-optimistic.ts

- updateRuleArchivedAt · function · L3-L11 — function updateRuleArchivedAt( rules: TranslationRuleRow[], ruleId: string, archivedAt: string | null, ): TranslationRuleRow[]
- removeArchivedRule · function · L13-L18 — function removeArchivedRule( rules: TranslationRuleRow[], ruleId: string, ): TranslationRuleRow[]
- toggleRuleActiveInRules · function · L20-L28 — function toggleRuleActiveInRules( rules: TranslationRuleRow[], ruleId: string, isActive: boolean, ): TranslationRuleRow[]
- toggleRuleActiveInFeedback · function · L30-L46 — function toggleRuleActiveInFeedback( feedback: FeedbackItem[], ruleId: string, isActive: boolean, ): FeedbackItem[]
- patchFeedbackRuleSyntax · function · L48-L64 — function patchFeedbackRuleSyntax( feedback: FeedbackItem[], ruleId: string, scryfallSyntax: string, ): FeedbackItem[]
