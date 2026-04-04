import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import type {
  RulesFilter,
  TranslationRuleRow,
} from '@/pages/admin-analytics/types';

type RulePatch = Partial<
  Pick<TranslationRuleRow, 'is_active' | 'scryfall_syntax' | 'archived_at'>
>;

interface UseTranslationRulesAdminOptions {
  enabled: boolean;
  onRulePatched?: (ruleId: string, patch: RulePatch) => void;
}

export function useTranslationRulesAdmin({
  enabled,
  onRulePatched,
}: UseTranslationRulesAdminOptions) {
  const [rules, setRules] = useState<TranslationRuleRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesFilter, setRulesFilter] = useState<RulesFilter>('all');
  const [rulesSearch, setRulesSearch] = useState('');
  const [showArchivedRules, setShowArchivedRules] = useState(false);
  const [ruleDirectTogglingId, setRuleDirectTogglingId] = useState<
    string | null
  >(null);
  const [archivingRuleId, setArchivingRuleId] = useState<string | null>(null);
  const [editValidating, setEditValidating] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editValidationError, setEditValidationError] = useState<string | null>(
    null,
  );
  const [editValidationCount, setEditValidationCount] = useState<number | null>(
    null,
  );

  const showArchivedRulesRef = useRef(false);

  const fetchRules = useCallback(
    async (includeArchived = showArchivedRulesRef.current) => {
      setRulesLoading(true);
      try {
        let query = supabase
          .from('translation_rules')
          .select(
            'id, pattern, scryfall_syntax, confidence, is_active, description, created_at, source_feedback_id, archived_at',
          )
          .order('created_at', { ascending: false })
          .limit(200);

        if (!includeArchived) {
          query = query.is('archived_at', null);
        }

        const { data: rows, error } = await query;
        if (error) throw error;
        setRules((rows as TranslationRuleRow[]) ?? []);
      } catch {
        toast.error('Failed to load translation rules');
      } finally {
        setRulesLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!enabled) return;
    void fetchRules();
  }, [enabled, fetchRules]);

  const patchRuleLocally = useCallback((ruleId: string, patch: RulePatch) => {
    setRules((prev) =>
      prev.map((rule) => (rule.id === ruleId ? { ...rule, ...patch } : rule)),
    );
  }, []);

  const toggleRuleDirect = useCallback(
    async (ruleId: string, currentActive: boolean) => {
      setRuleDirectTogglingId(ruleId);
      patchRuleLocally(ruleId, { is_active: !currentActive });
      onRulePatched?.(ruleId, { is_active: !currentActive });

      const { error } = await supabase
        .from('translation_rules')
        .update({ is_active: !currentActive })
        .eq('id', ruleId);

      if (error) {
        patchRuleLocally(ruleId, { is_active: currentActive });
        onRulePatched?.(ruleId, { is_active: currentActive });
        toast.error('Failed to update rule');
      } else {
        toast.success(currentActive ? 'Rule deactivated' : 'Rule activated');
      }
      setRuleDirectTogglingId(null);
    },
    [onRulePatched, patchRuleLocally],
  );

  const archiveRule = useCallback(
    async (ruleId: string, isCurrentlyArchived: boolean) => {
      setArchivingRuleId(ruleId);
      const newArchivedAt = isCurrentlyArchived
        ? null
        : new Date().toISOString();
      patchRuleLocally(ruleId, { archived_at: newArchivedAt });

      const { error } = await supabase
        .from('translation_rules')
        .update({ archived_at: newArchivedAt })
        .eq('id', ruleId);

      if (error) {
        patchRuleLocally(ruleId, {
          archived_at: isCurrentlyArchived ? new Date().toISOString() : null,
        });
        toast.error('Failed to update rule');
      } else {
        toast.success(isCurrentlyArchived ? 'Rule restored' : 'Rule archived');
        if (!showArchivedRulesRef.current && !isCurrentlyArchived) {
          setTimeout(() => {
            setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
          }, 600);
        }
      }
      setArchivingRuleId(null);
    },
    [patchRuleLocally],
  );

  const validateAndSaveRuleSyntax = useCallback(
    async (ruleId: string, newSyntax: string) => {
      const trimmed = newSyntax.trim();
      if (!trimmed) return false;

      setEditValidating(true);
      setEditValidationError(null);
      setEditValidationCount(null);

      let validationOk = false;
      let validationCount = 0;
      let validationError = '';

      try {
        const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(trimmed)}&extras=true`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'OffMeta-Admin/1.0 (rule-editor)' },
        });

        if (response.status === 200) {
          const data = (await response.json()) as { total_cards?: number };
          validationCount = data.total_cards ?? 0;
          if (validationCount > 0) {
            validationOk = true;
            setEditValidationCount(validationCount);
          } else {
            validationError =
              'Query returned 0 results on Scryfall — tighten or correct the syntax';
          }
        } else if (response.status === 404) {
          await response.text();
          validationError =
            'Scryfall returned 404 — query is invalid or matched no cards';
        } else {
          const body = await response.text();
          try {
            const parsed = JSON.parse(body) as {
              details?: string;
              warnings?: string[];
            };
            validationError =
              parsed.details ||
              parsed.warnings?.join('; ') ||
              `Scryfall error ${response.status}`;
          } catch {
            validationError = `Scryfall returned HTTP ${response.status}`;
          }
        }
      } catch {
        validationError =
          'Could not reach Scryfall to validate — check your connection and try again';
      }

      setEditValidating(false);

      if (!validationOk) {
        setEditValidationError(validationError);
        return false;
      }

      setEditSaving(true);
      const { error } = await supabase
        .from('translation_rules')
        .update({ scryfall_syntax: trimmed })
        .eq('id', ruleId);

      if (error) {
        toast.error('Failed to save rule syntax');
        setEditSaving(false);
        return false;
      }

      patchRuleLocally(ruleId, { scryfall_syntax: trimmed });
      onRulePatched?.(ruleId, { scryfall_syntax: trimmed });
      toast.success(
        `Rule updated · ${validationCount.toLocaleString()} cards found`,
      );
      setEditValidationCount(null);
      setEditSaving(false);
      return true;
    },
    [onRulePatched, patchRuleLocally],
  );

  const toggleArchivedRules = useCallback(
    (next: boolean) => {
      setShowArchivedRules(next);
      showArchivedRulesRef.current = next;
      void fetchRules(next);
    },
    [fetchRules],
  );

  return {
    rules,
    setRules,
    rulesLoading,
    rulesFilter,
    setRulesFilter,
    rulesSearch,
    setRulesSearch,
    showArchivedRules,
    setShowArchivedRules: toggleArchivedRules,
    ruleDirectTogglingId,
    archivingRuleId,
    editValidating,
    editSaving,
    editValidationError,
    setEditValidationError,
    editValidationCount,
    setEditValidationCount,
    fetchRules,
    toggleRuleDirect,
    archiveRule,
    patchRuleLocally,
    validateAndSaveRuleSyntax,
  };
}
