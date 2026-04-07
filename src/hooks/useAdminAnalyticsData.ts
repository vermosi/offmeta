/**
 * Central data hook for the Admin Analytics dashboard.
 *
 * Owns all state, data fetching, real-time subscriptions, and mutation
 * callbacks that were previously inlined in the monolithic AdminAnalytics page.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAnalyticsFilters } from '@/hooks/useAdminAnalyticsFilters';
import { logger } from '@/lib/core/logger';
import type {
  AnalyticsData,
  FeedbackFilter,
  FeedbackItem,
  RulesFilter,
  TranslationRuleRow,
} from '@/pages/admin-analytics/types';

export function useAdminAnalyticsData(user: { id: string } | null, isAdmin: boolean) {
  // ── Analytics state ────────────────────────────────────────────────────
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState('7');

  // ── Feedback state ─────────────────────────────────────────────────────
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>('all');
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());
  const [ruleTogglingId, setRuleTogglingId] = useState<string | null>(null);
  const [retriggeringId, setRetriggeringId] = useState<string | null>(null);
  const [processingAllPending, setProcessingAllPending] = useState(false);

  // ── Translation Rules state ────────────────────────────────────────────
  const [rules, setRules] = useState<TranslationRuleRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesFilter, setRulesFilter] = useState<RulesFilter>('all');
  const [rulesSearch, setRulesSearch] = useState('');
  const [ruleDirectTogglingId, setRuleDirectTogglingId] = useState<string | null>(null);
  const [showArchivedRules, setShowArchivedRules] = useState(false);
  const showArchivedRulesRef = useRef(false);
  const [archivingRuleId, setArchivingRuleId] = useState<string | null>(null);

  // ── Inline syntax editing state ────────────────────────────────────────
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editingSyntax, setEditingSyntax] = useState('');
  const [editValidating, setEditValidating] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editValidationError, setEditValidationError] = useState<string | null>(null);
  const [editValidationCount, setEditValidationCount] = useState<number | null>(null);

  // ── Realtime ───────────────────────────────────────────────────────────
  const [isLive, setIsLive] = useState(false);
  const liveCountRef = useRef(0);
  const initialLoadDoneRef = useRef(false);
  const daysInitialized = useRef(false);

  // ── Derived / filtered values ──────────────────────────────────────────
  const filters = useAdminAnalyticsFilters({
    feedback,
    feedbackFilter,
    rules,
    rulesFilter,
    rulesSearch,
  });

  // ── Fetch analytics ────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-analytics?days=${days}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        },
      );

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(errBody || `HTTP ${response.status}`);
      }

      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (e) {
      void e;
      toast.error('Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  // ── Fetch feedback ─────────────────────────────────────────────────────
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
    } catch (err) {
      logger.error('[AdminAnalytics] Failed to load feedback:', err);
      toast.error('Failed to load feedback');
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  // ── Fetch rules ────────────────────────────────────────────────────────
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

  // ── Archive / restore rule ─────────────────────────────────────────────
  const archiveRule = useCallback(
    async (ruleId: string, isCurrentlyArchived: boolean) => {
      setArchivingRuleId(ruleId);
      const newArchivedAt = isCurrentlyArchived ? null : new Date().toISOString();
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, archived_at: newArchivedAt } : r)),
      );
      const { error } = await supabase
        .from('translation_rules')
        .update({ archived_at: newArchivedAt })
        .eq('id', ruleId);
      if (error) {
        setRules((prev) =>
          prev.map((r) =>
            r.id === ruleId
              ? { ...r, archived_at: isCurrentlyArchived ? new Date().toISOString() : null }
              : r,
          ),
        );
        toast.error('Failed to update rule');
      } else {
        toast.success(isCurrentlyArchived ? 'Rule restored' : 'Rule archived');
        if (!showArchivedRulesRef.current && !isCurrentlyArchived) {
          setTimeout(() => setRules((prev) => prev.filter((r) => r.id !== ruleId)), 600);
        }
      }
      setArchivingRuleId(null);
    },
    [],
  );

  // ── Validate & save rule syntax ────────────────────────────────────────
  const validateAndSaveRuleSyntax = useCallback(
    async (ruleId: string, newSyntax: string) => {
      const trimmed = newSyntax.trim();
      if (!trimmed) return;

      setEditValidating(true);
      setEditValidationError(null);
      setEditValidationCount(null);

      let validationOk = false;
      let validationCount = 0;
      let validationError = '';

      try {
        const url = `https://api.scryfall.com/cards/search?q=${encodeURIComponent(trimmed)}&extras=true`;
        const resp = await fetch(url, {
          headers: { 'User-Agent': 'OffMeta-Admin/1.0 (rule-editor)' },
        });

        if (resp.status === 200) {
          const data = await resp.json();
          validationCount = data.total_cards ?? 0;
          if (validationCount > 0) {
            validationOk = true;
            setEditValidationCount(validationCount);
          } else {
            validationError = 'Query returned 0 results on Scryfall — tighten or correct the syntax';
          }
        } else if (resp.status === 404) {
          await resp.text();
          validationError = 'Scryfall returned 404 — query is invalid or matched no cards';
        } else {
          const body = await resp.text();
          try {
            const parsed = JSON.parse(body);
            validationError =
              parsed.details || parsed.warnings?.join('; ') || `Scryfall error ${resp.status}`;
          } catch {
            validationError = `Scryfall returned HTTP ${resp.status}`;
          }
        }
      } catch {
        validationError = 'Could not reach Scryfall to validate — check your connection and try again';
      }

      setEditValidating(false);

      if (!validationOk) {
        setEditValidationError(validationError);
        return;
      }

      setEditSaving(true);
      const { error } = await supabase
        .from('translation_rules')
        .update({ scryfall_syntax: trimmed })
        .eq('id', ruleId);

      if (error) {
        toast.error('Failed to save rule syntax');
      } else {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, scryfall_syntax: trimmed } : r)),
        );
        setFeedback((prev) =>
          prev.map((f) =>
            f.generated_rule_id === ruleId && f.translation_rules
              ? { ...f, translation_rules: { ...f.translation_rules, scryfall_syntax: trimmed } }
              : f,
          ),
        );
        toast.success(`Rule updated · ${validationCount.toLocaleString()} cards found`);
        setEditingRuleId(null);
        setEditingSyntax('');
        setEditValidationCount(null);
      }
      setEditSaving(false);
    },
    [],
  );

  const cancelEditRule = useCallback(() => {
    setEditingRuleId(null);
    setEditingSyntax('');
    setEditValidationError(null);
    setEditValidationCount(null);
  }, []);

  // ── Toggle rule active (from rules panel) ──────────────────────────────
  const toggleRuleDirect = useCallback(
    async (ruleId: string, currentActive: boolean) => {
      setRuleDirectTogglingId(ruleId);
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, is_active: !currentActive } : r)),
      );
      setFeedback((prev) =>
        prev.map((f) =>
          f.generated_rule_id === ruleId && f.translation_rules
            ? { ...f, translation_rules: { ...f.translation_rules, is_active: !currentActive } }
            : f,
        ),
      );
      const { error } = await supabase
        .from('translation_rules')
        .update({ is_active: !currentActive })
        .eq('id', ruleId);
      if (error) {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, is_active: currentActive } : r)),
        );
        setFeedback((prev) =>
          prev.map((f) =>
            f.generated_rule_id === ruleId && f.translation_rules
              ? { ...f, translation_rules: { ...f.translation_rules, is_active: currentActive } }
              : f,
          ),
        );
        toast.error('Failed to update rule');
      } else {
        toast.success(currentActive ? 'Rule deactivated' : 'Rule activated');
      }
      setRuleDirectTogglingId(null);
    },
    [],
  );

  // ── Toggle rule active (from feedback panel) ───────────────────────────
  const toggleRuleActive = useCallback(
    async (feedbackId: string, ruleId: string, currentActive: boolean) => {
      setRuleTogglingId(feedbackId);
      setFeedback((prev) =>
        prev.map((f) =>
          f.id === feedbackId && f.translation_rules
            ? { ...f, translation_rules: { ...f.translation_rules, is_active: !currentActive } }
            : f,
        ),
      );
      const { error } = await supabase
        .from('translation_rules')
        .update({ is_active: !currentActive })
        .eq('id', ruleId);
      if (error) {
        setFeedback((prev) =>
          prev.map((f) =>
            f.id === feedbackId && f.translation_rules
              ? { ...f, translation_rules: { ...f.translation_rules, is_active: currentActive } }
              : f,
          ),
        );
        toast.error('Failed to update rule');
      } else {
        toast.success(currentActive ? 'Rule deactivated' : 'Rule activated');
      }
      setRuleTogglingId(null);
    },
    [],
  );

  // ── Retrigger feedback ─────────────────────────────────────────────────
  const retriggerFeedback = useCallback(
    async (feedbackId: string) => {
      setRetriggeringId(feedbackId);
      setFeedback((prev) =>
        prev.map((f) => (f.id === feedbackId ? { ...f, processing_status: 'processing' } : f)),
      );
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const res = await fetch(
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
        const result = await res.json();
        if (!res.ok) throw new Error(result.error ?? `HTTP ${res.status}`);
        toast.success(`Re-processed: ${result.status ?? 'done'}`);
        await fetchFeedback();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Re-trigger failed');
        setFeedback((prev) =>
          prev.map((f) => (f.id === feedbackId ? { ...f, processing_status: 'failed' } : f)),
        );
      } finally {
        setRetriggeringId(null);
      }
    },
    [fetchFeedback],
  );

  // ── Process all pending ────────────────────────────────────────────────
  const processAllPending = useCallback(async () => {
    const pendingItems = feedback.filter(
      (f) => f.processing_status === 'pending' || f.processing_status == null,
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
          const res = await fetch(
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
          if (res.ok) successCount++;
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

  // ── Toggle showArchivedRules ───────────────────────────────────────────
  const toggleShowArchivedRules = useCallback(() => {
    const next = !showArchivedRules;
    setShowArchivedRules(next);
    showArchivedRulesRef.current = next;
    void fetchRules(next);
  }, [showArchivedRules, fetchRules]);

  // ── Effects: initial load, polling, days change, realtime ──────────────

  // Re-fetch analytics only when days changes (skip initial mount)
  useEffect(() => {
    if (!isAdmin || !user) return;
    if (!daysInitialized.current) {
      daysInitialized.current = true;
      return;
    }
    fetchAnalytics();
  }, [days, isAdmin, user, fetchAnalytics]);

  // Poll feedback & rules every 30s
  useEffect(() => {
    if (!isAdmin || !user) return;
    const interval = setInterval(() => {
      fetchFeedback();
      fetchRules();
    }, 30_000);
    return () => clearInterval(interval);
  }, [isAdmin, user, fetchFeedback, fetchRules]);

  // Initial load
  useEffect(() => {
    if (!isAdmin || !user || initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;
    fetchAnalytics();
    fetchFeedback();
    fetchRules();
  }, [isAdmin, user, fetchAnalytics, fetchFeedback, fetchRules]);

  // Realtime subscriptions
  useEffect(() => {
    if (!isAdmin || !user) return;
    const channel = supabase
      .channel('admin-analytics-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'translation_logs' },
        (payload) => {
          const row = payload.new as {
            confidence_score: number | null;
            response_time_ms: number | null;
            fallback_used: boolean | null;
            source: string | null;
            created_at: string | null;
            natural_language_query: string;
            translated_query: string;
          };
          liveCountRef.current++;

          setData((prev) => {
            if (!prev) return prev;
            const total = prev.summary.totalSearches + 1;
            const conf = row.confidence_score ?? 0;
            const respTime = row.response_time_ms ?? 0;
            const newAvgConf =
              (prev.summary.avgConfidence * prev.summary.totalSearches + conf) / total;
            const newAvgResp = Math.round(
              (prev.summary.avgResponseTime * prev.summary.totalSearches + respTime) / total,
            );
            const fallbackCount =
              Math.round((prev.summary.fallbackRate * prev.summary.totalSearches) / 100) +
              (row.fallback_used ? 1 : 0);

            const src = row.source || 'ai';
            const sourceBreakdown = {
              ...prev.sourceBreakdown,
              [src]: (prev.sourceBreakdown[src] || 0) + 1,
            };

            const buckets = { ...prev.confidenceBuckets };
            if (conf >= 0.8) buckets.high++;
            else if (conf >= 0.6) buckets.medium++;
            else buckets.low++;

            const day = row.created_at?.substring(0, 10) || 'unknown';
            const dailyVolume = {
              ...prev.dailyVolume,
              [day]: (prev.dailyVolume[day] || 0) + 1,
            };

            const lowConfidenceQueries =
              conf < 0.6
                ? [
                    {
                      query: row.natural_language_query,
                      translated: row.translated_query,
                      confidence: conf,
                      source: src,
                      time: row.created_at || new Date().toISOString(),
                    },
                    ...prev.lowConfidenceQueries,
                  ].slice(0, 20)
                : prev.lowConfidenceQueries;

            return {
              ...prev,
              summary: {
                ...prev.summary,
                totalSearches: total,
                avgConfidence: Math.round(newAvgConf * 100) / 100,
                avgResponseTime: newAvgResp,
                fallbackRate: total > 0 ? Math.round((fallbackCount / total) * 100) : 0,
              },
              sourceBreakdown,
              confidenceBuckets: buckets,
              dailyVolume,
              lowConfidenceQueries,
            };
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'analytics_events' },
        (payload) => {
          const row = payload.new as { event_type: string };
          setData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              eventBreakdown: {
                ...prev.eventBreakdown,
                [row.event_type]: (prev.eventBreakdown[row.event_type] || 0) + 1,
              },
            };
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'search_feedback' },
        (payload) => {
          const row = payload.new as FeedbackItem;
          setFeedback((prev) => {
            if (prev.some((f) => f.id === row.id)) return prev;
            return [
              { ...row, translation_rules: null, scryfall_validation_count: null },
              ...prev,
            ].slice(0, 100);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'search_feedback' },
        (payload) => {
          const row = payload.new as FeedbackItem;
          setFeedback((prev) => {
            const exists = prev.some((f) => f.id === row.id);
            if (!exists) return prev;

            if (row.generated_rule_id) {
              void supabase
                .from('search_feedback')
                .select(
                  `
                  id, original_query, translated_query, issue_description,
                  processing_status, created_at, processed_at, generated_rule_id,
                  scryfall_validation_count,
                  translation_rules!fk_search_feedback_generated_rule ( pattern, scryfall_syntax, confidence, is_active, description )
                `,
                )
                .eq('id', row.id)
                .single()
                .then(({ data }) => {
                  if (!data) return;
                  setFeedback((cur) =>
                    cur.map((f) => (f.id === row.id ? (data as unknown as FeedbackItem) : f)),
                  );
                });
            } else {
              setFeedback((cur) =>
                cur.map((f) =>
                  f.id === row.id
                    ? {
                        ...f,
                        processing_status: row.processing_status,
                        processed_at: row.processed_at,
                        scryfall_validation_count: row.scryfall_validation_count,
                      }
                    : f,
                ),
              );
            }

            return prev;
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'translation_rules' },
        (payload) => {
          const row = payload.new as TranslationRuleRow;
          setRules((prev) => {
            if (prev.some((r) => r.id === row.id)) return prev;
            return [row, ...prev].slice(0, 200);
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'translation_rules' },
        (payload) => {
          const row = payload.new as TranslationRuleRow;
          setRules((prev) => prev.map((r) => (r.id === row.id ? { ...r, ...row } : r)));
          setFeedback((prev) =>
            prev.map((f) =>
              f.generated_rule_id === row.id && f.translation_rules
                ? { ...f, translation_rules: { ...f.translation_rules, is_active: row.is_active } }
                : f,
            ),
          );
        },
      )
      .subscribe((status) => {
        setIsLive(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
      setIsLive(false);
    };
  }, [isAdmin, user]);

  return {
    // Analytics
    data,
    isLoading,
    days,
    setDays,
    fetchAnalytics,
    isLive,

    // Feedback
    feedback,
    feedbackLoading,
    feedbackFilter,
    setFeedbackFilter,
    expandedFeedback,
    setExpandedFeedback,
    ruleTogglingId,
    retriggeringId,
    processingAllPending,
    fetchFeedback,
    toggleRuleActive,
    retriggerFeedback,
    processAllPending,

    // Rules
    rules,
    rulesLoading,
    rulesFilter,
    setRulesFilter,
    rulesSearch,
    setRulesSearch,
    ruleDirectTogglingId,
    showArchivedRules,
    archivingRuleId,
    editingRuleId,
    editingSyntax,
    editValidating,
    editSaving,
    editValidationError,
    editValidationCount,
    fetchRules,
    archiveRule,
    validateAndSaveRuleSyntax,
    cancelEditRule,
    toggleRuleDirect,
    toggleShowArchivedRules,
    setEditingRuleId,
    setEditingSyntax,
    setEditValidationError,
    setEditValidationCount,

    // Filters
    ...filters,
  };
}
