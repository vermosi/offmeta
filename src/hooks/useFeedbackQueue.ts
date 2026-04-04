import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { logger } from '@/lib/core/logger';
import { supabase } from '@/integrations/supabase/client';
import type {
  FeedbackFilter,
  FeedbackItem,
} from '@/pages/admin-analytics/types';

interface UseFeedbackQueueOptions {
  enabled: boolean;
  onRulePatched?: (
    ruleId: string,
    patch: Partial<FeedbackItem['translation_rules']>,
  ) => void;
}

export function useFeedbackQueue({
  enabled,
  onRulePatched,
}: UseFeedbackQueueOptions) {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>('all');
  const [ruleTogglingId, setRuleTogglingId] = useState<string | null>(null);
  const [retriggeringId, setRetriggeringId] = useState<string | null>(null);
  const [processingAllPending, setProcessingAllPending] = useState(false);

  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('search_feedback')
        .select(
          `
          id, original_query, translated_query, issue_description,
          processing_status, created_at, processed_at, generated_rule_id,
          scryfall_validation_count,
          translation_rules!fk_search_feedback_generated_rule ( pattern, scryfall_syntax, confidence, is_active, description )
        `,
        )
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setFeedback((rows as unknown as FeedbackItem[]) ?? []);
    } catch (error) {
      logger.error('[AdminAnalytics] Failed to load feedback:', error);
      toast.error('Failed to load feedback');
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void fetchFeedback();
  }, [enabled, fetchFeedback]);

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

  const toggleRuleActive = useCallback(
    async (feedbackId: string, ruleId: string, currentActive: boolean) => {
      setRuleTogglingId(feedbackId);
      setFeedback((prev) =>
        prev.map((item) =>
          item.id === feedbackId && item.translation_rules
            ? {
                ...item,
                translation_rules: {
                  ...item.translation_rules,
                  is_active: !currentActive,
                },
              }
            : item,
        ),
      );
      onRulePatched?.(ruleId, { is_active: !currentActive });

      const { error } = await supabase
        .from('translation_rules')
        .update({ is_active: !currentActive })
        .eq('id', ruleId);

      if (error) {
        setFeedback((prev) =>
          prev.map((item) =>
            item.id === feedbackId && item.translation_rules
              ? {
                  ...item,
                  translation_rules: {
                    ...item.translation_rules,
                    is_active: currentActive,
                  },
                }
              : item,
          ),
        );
        onRulePatched?.(ruleId, { is_active: currentActive });
        toast.error('Failed to update rule');
      } else {
        toast.success(currentActive ? 'Rule deactivated' : 'Rule activated');
      }
      setRuleTogglingId(null);
    },
    [onRulePatched],
  );

  const retriggerFeedback = useCallback(
    async (feedbackId: string) => {
      setRetriggeringId(feedbackId);
      setFeedback((prev) =>
        prev.map((item) =>
          item.id === feedbackId
            ? { ...item, processing_status: 'processing' }
            : item,
        ),
      );

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-feedback`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session?.access_token ?? ''}`,
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ feedbackId }),
          },
        );

        const result = (await response.json()) as {
          error?: string;
          status?: string;
        };
        if (!response.ok) {
          throw new Error(result.error ?? `HTTP ${response.status}`);
        }

        toast.success(`Re-processed: ${result.status ?? 'done'}`);
        await fetchFeedback();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Re-trigger failed',
        );
        setFeedback((prev) =>
          prev.map((item) =>
            item.id === feedbackId
              ? { ...item, processing_status: 'failed' }
              : item,
          ),
        );
      } finally {
        setRetriggeringId(null);
      }
    },
    [fetchFeedback],
  );

  const processAllPending = useCallback(async () => {
    const pendingItems = feedback.filter(
      (item) =>
        item.processing_status === 'pending' || item.processing_status == null,
    );

    if (pendingItems.length === 0) {
      toast.info('No pending feedback to process');
      return;
    }

    setProcessingAllPending(true);
    let successCount = 0;
    let failCount = 0;

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        toast.error('Not authenticated');
        return;
      }

      for (const item of pendingItems) {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-feedback`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
                apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              },
              body: JSON.stringify({ feedbackId: item.id }),
            },
          );
          if (response.ok) successCount++;
          else failCount++;
        } catch {
          failCount++;
        }
      }

      toast.success(
        `Processed ${successCount} items${failCount > 0 ? `, ${failCount} failed` : ''}`,
      );
      await fetchFeedback();
    } catch {
      toast.error('Failed to process pending feedback');
    } finally {
      setProcessingAllPending(false);
    }
  }, [feedback, fetchFeedback]);

  const patchFeedbackRule = useCallback(
    (
      ruleId: string,
      patch: Partial<NonNullable<FeedbackItem['translation_rules']>>,
    ) => {
      setFeedback((prev) =>
        prev.map((item) =>
          item.generated_rule_id === ruleId && item.translation_rules
            ? {
                ...item,
                translation_rules: {
                  ...item.translation_rules,
                  ...patch,
                },
              }
            : item,
        ),
      );
    },
    [],
  );

  return {
    feedback,
    setFeedback,
    feedbackLoading,
    feedbackFilter,
    setFeedbackFilter,
    filteredFeedback,
    ruleTogglingId,
    retriggeringId,
    processingAllPending,
    fetchFeedback,
    toggleRuleActive,
    retriggerFeedback,
    processAllPending,
    patchFeedbackRule,
  };
}
