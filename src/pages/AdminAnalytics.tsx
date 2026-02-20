/**
 * Admin Analytics Dashboard
 *
 * Protected page (`user_roles.role = 'admin'` required) that surfaces
 * aggregated search pipeline telemetry and a full feedback queue panel.
 *
 * ## Analytics sections
 * - Summary stats: total searches, avg confidence, AI usage rate, p50/p95/p99 response times
 * - Daily search volume chart (lookback window: 1–90 days, default 7)
 * - Source distribution: cache / deterministic / pattern_match / ai / raw_syntax
 * - Confidence score buckets and deterministic coverage trend
 * - Top 20 most-searched queries and low-confidence query review list
 *
 * ## Feedback queue panel
 * - Displays every `search_feedback` row with a color-coded pipeline status badge:
 *   `pending` (amber) · `processing` (blue) · `completed` / `updated_existing` (green)
 *   · `failed` (red) · `skipped` / `duplicate` / `archived` (gray).
 * - Filter by status via dropdown.
 * - Inline display of the linked AI-generated `translation_rules` row
 *   (pattern, Scryfall syntax, confidence %).
 * - One-click approve/reject toggle: flips `translation_rules.is_active`
 *   with an optimistic update that reverts on error.
 * - Re-trigger button for `failed` and `skipped` rows — calls the
 *   `process-feedback` edge function and resets status to `pending`.
 *
 * Data is fetched from the `admin-analytics` edge function (GET ?days=N)
 * and supplemented by direct Supabase queries for the feedback queue.
 *
 * @see supabase/functions/admin-analytics/index.ts
 * @see src/hooks/useUserRole.ts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import {
  Loader2,
  ArrowLeft,
  BarChart3,
  Clock,
  Target,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Zap,
  ShieldAlert,
  Download,
  Search,
  Gauge,
  MessageSquareWarning,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Code2,
  Sparkles,
  BookOpen,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SkipLinks } from '@/components/SkipLinks';

/** Joined shape returned by the search_feedback + translation_rules query. */
interface TranslationRule {
  pattern: string;
  scryfall_syntax: string;
  confidence: number | null;
  is_active: boolean;
  description: string | null;
}

interface FeedbackItem {
  id: string;
  original_query: string;
  translated_query: string | null;
  issue_description: string;
  processing_status: string | null;
  created_at: string;
  processed_at: string | null;
  generated_rule_id: string | null;
  translation_rules: TranslationRule | null;
}

/** Full translation_rules row for the standalone rules panel. */
interface TranslationRuleRow {
  id: string;
  pattern: string;
  scryfall_syntax: string;
  confidence: number | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
  source_feedback_id: string | null;
}

type RulesFilter = 'all' | 'active' | 'inactive';

type FeedbackFilter = 'all' | 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | 'archived';

interface PopularQuery {
  query: string;
  count: number;
  avg_confidence: number;
  primary_source: string;
}

interface AnalyticsData {
  summary: {
    totalSearches: number;
    avgConfidence: number;
    avgResponseTime: number;
    fallbackRate: number;
    days: number;
  };
  sourceBreakdown: Record<string, number>;
  confidenceBuckets: { high: number; medium: number; low: number };
  dailyVolume: Record<string, number>;
  eventBreakdown: Record<string, number>;
  lowConfidenceQueries: Array<{
    query: string;
    translated: string;
    confidence: number;
    source: string;
    time: string;
  }>;
  popularQueries: PopularQuery[];
  responsePercentiles: { p50: number; p95: number; p99: number };
  deterministicCoverage: Record<string, number>;
}

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  variant = 'default',
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantClasses = {
    default: 'border-border',
    success: 'border-success/30',
    warning: 'border-warning/30',
    danger: 'border-destructive/30',
  };

  return (
    <div className={`surface-elevated p-4 sm:p-5 border ${variantClasses[variant]}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}

function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {value} ({Math.round(pct)}%)
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function exportToCsv(data: AnalyticsData) {
  const rows: string[] = [];
  
  // Summary
  rows.push('Section,Metric,Value');
  rows.push(`Summary,Total Searches,${data.summary.totalSearches}`);
  rows.push(`Summary,Avg Confidence,${data.summary.avgConfidence}`);
  rows.push(`Summary,Avg Response Time (ms),${data.summary.avgResponseTime}`);
  rows.push(`Summary,Fallback Rate (%),${data.summary.fallbackRate}`);
  rows.push(`Summary,P50 Response (ms),${data.responsePercentiles.p50}`);
  rows.push(`Summary,P95 Response (ms),${data.responsePercentiles.p95}`);
  rows.push(`Summary,P99 Response (ms),${data.responsePercentiles.p99}`);
  rows.push('');
  
  // Source breakdown
  rows.push('Source,Count');
  for (const [source, count] of Object.entries(data.sourceBreakdown)) {
    rows.push(`${source},${count}`);
  }
  rows.push('');
  
  // Popular queries
  rows.push('Popular Query,Count,Avg Confidence,Primary Source');
  for (const pq of data.popularQueries) {
    rows.push(`"${pq.query.replace(/"/g, '""')}",${pq.count},${pq.avg_confidence},${pq.primary_source}`);
  }
  rows.push('');
  
  // Daily volume
  rows.push('Date,Searches');
  for (const [day, count] of Object.entries(data.dailyVolume).sort(([a], [b]) => a.localeCompare(b))) {
    rows.push(`${day},${count}`);
  }
  rows.push('');

  // Coverage trend
  rows.push('Date,Deterministic Coverage (%)');
  for (const [day, pct] of Object.entries(data.deterministicCoverage).sort(([a], [b]) => a.localeCompare(b))) {
    rows.push(`${day},${pct}`);
  }

  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `offmeta-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminAnalytics() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasRole: isAdmin, isLoading: roleLoading } = useUserRole('admin');
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [days, setDays] = useState('7');
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackFilter, setFeedbackFilter] = useState<FeedbackFilter>('all');
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());
  const [ruleTogglingId, setRuleTogglingId] = useState<string | null>(null);
  const [retriggeringId, setRetriggeringId] = useState<string | null>(null);

  // Translation Rules panel state
  const [rules, setRules] = useState<TranslationRuleRow[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesFilter, setRulesFilter] = useState<RulesFilter>('all');
  const [rulesSearch, setRulesSearch] = useState('');
  const [ruleDirectTogglingId, setRuleDirectTogglingId] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user || !isAdmin) {
        navigate('/', { replace: true });
      }
    }
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

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

  const fetchFeedback = useCallback(async () => {
    setFeedbackLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('search_feedback')
        .select(`
          id, original_query, translated_query, issue_description,
          processing_status, created_at, processed_at, generated_rule_id,
          translation_rules ( pattern, scryfall_syntax, confidence, is_active, description )
        `)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setFeedback((rows as unknown as FeedbackItem[]) ?? []);
    } catch {
      toast.error('Failed to load feedback');
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  /** Fetch all translation_rules for the standalone management panel. */
  const fetchRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const { data: rows, error } = await supabase
        .from('translation_rules')
        .select('id, pattern, scryfall_syntax, confidence, is_active, description, created_at, source_feedback_id')
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      setRules((rows as TranslationRuleRow[]) ?? []);
    } catch {
      toast.error('Failed to load translation rules');
    } finally {
      setRulesLoading(false);
    }
  }, []);

  /** Toggle is_active directly in the rules panel with optimistic update. */
  const toggleRuleDirect = useCallback(async (ruleId: string, currentActive: boolean) => {
    setRuleDirectTogglingId(ruleId);
    // Optimistic
    setRules((prev) =>
      prev.map((r) => r.id === ruleId ? { ...r, is_active: !currentActive } : r),
    );
    // Also sync feedback panel if rule appears there
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
      // Revert
      setRules((prev) =>
        prev.map((r) => r.id === ruleId ? { ...r, is_active: currentActive } : r),
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
  }, []);

  /** Toggle is_active on a linked translation_rules row with optimistic update. */
  const toggleRuleActive = useCallback(async (feedbackId: string, ruleId: string, currentActive: boolean) => {
    setRuleTogglingId(feedbackId);
    // Optimistic update
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
      // Revert on failure
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
  }, []);

  /** Re-trigger process-feedback for failed/skipped items. */
  const retriggerFeedback = useCallback(async (feedbackId: string) => {
    setRetriggeringId(feedbackId);
    // Optimistically reset status to processing
    setFeedback((prev) =>
      prev.map((f) => f.id === feedbackId ? { ...f, processing_status: 'processing' } : f),
    );
    try {
      const { data: { session } } = await supabase.auth.getSession();
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
        prev.map((f) => f.id === feedbackId ? { ...f, processing_status: 'failed' } : f),
      );
    } finally {
      setRetriggeringId(null);
    }
  }, [fetchFeedback]);

  useEffect(() => {
    if (isAdmin && user) {
      fetchAnalytics();
      fetchFeedback();
      fetchRules();
    }
  }, [isAdmin, user, fetchAnalytics, fetchFeedback, fetchRules]);

  // Real-time subscriptions for live updates
  const [isLive, setIsLive] = useState(false);
  const liveCountRef = useRef(0);

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
            const newAvgConf = (prev.summary.avgConfidence * prev.summary.totalSearches + conf) / total;
            const newAvgResp = Math.round(
              (prev.summary.avgResponseTime * prev.summary.totalSearches + respTime) / total,
            );
            const fallbackCount = Math.round(prev.summary.fallbackRate * prev.summary.totalSearches / 100) + (row.fallback_used ? 1 : 0);

            const src = row.source || 'ai';
            const sourceBreakdown = { ...prev.sourceBreakdown, [src]: (prev.sourceBreakdown[src] || 0) + 1 };

            const buckets = { ...prev.confidenceBuckets };
            if (conf >= 0.8) buckets.high++;
            else if (conf >= 0.6) buckets.medium++;
            else buckets.low++;

            const day = row.created_at?.substring(0, 10) || 'unknown';
            const dailyVolume = { ...prev.dailyVolume, [day]: (prev.dailyVolume[day] || 0) + 1 };

            const lowConfidenceQueries = conf < 0.6
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
      // ── Feedback queue: new submission arrives ──────────────────────────
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'search_feedback' },
        (payload) => {
          const row = payload.new as FeedbackItem;
          setFeedback((prev) => {
            // Avoid duplicates if fetchFeedback already picked it up
            if (prev.some((f) => f.id === row.id)) return prev;
            return [{ ...row, translation_rules: null }, ...prev].slice(0, 100);
          });
        },
      )
      // ── Feedback queue: status or rule changes (process-feedback writes) ─
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'search_feedback' },
        (payload) => {
          const row = payload.new as FeedbackItem;
          setFeedback((prev) => {
            const exists = prev.some((f) => f.id === row.id);
            if (!exists) return prev;

            // If generated_rule_id just appeared we need the full join —
            // refetch so the inline rule box populates.
            if (row.generated_rule_id) {
              // Fire-and-forget: fetchFeedback keeps the ref fresh
              void supabase
                .from('search_feedback')
                .select(`
                  id, original_query, translated_query, issue_description,
                  processing_status, created_at, processed_at, generated_rule_id,
                  translation_rules ( pattern, scryfall_syntax, confidence, is_active, description )
                `)
                .eq('id', row.id)
                .single()
                .then(({ data }) => {
                  if (!data) return;
                  setFeedback((cur) =>
                    cur.map((f) => (f.id === row.id ? (data as unknown as FeedbackItem) : f)),
                  );
                });
            } else {
              // No linked rule yet — just update the scalar fields
              setFeedback((cur) =>
                cur.map((f) =>
                  f.id === row.id
                    ? { ...f, processing_status: row.processing_status, processed_at: row.processed_at }
                    : f,
                ),
              );
            }
            return prev; // state is updated inside the async branch above
          });
        },
      )
      // ── Translation Rules panel: new rule generated ─────────────────────
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
      // ── Translation Rules panel: rule updated (e.g. is_active toggled) ──
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'translation_rules' },
        (payload) => {
          const row = payload.new as TranslationRuleRow;
          setRules((prev) =>
            prev.map((r) => r.id === row.id ? { ...r, ...row } : r),
          );
          // Keep feedback panel in sync
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


  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <div className="fixed inset-0 pointer-events-none bg-page-gradient" aria-hidden="true" />
      <div className="fixed inset-0 pointer-events-none bg-page-noise" aria-hidden="true" />

      <SkipLinks />
      <Header />

      <main id="main-content" className="relative flex-1 pt-6 sm:pt-10 pb-16">
        <div className="container-main max-w-5xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>

          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Search Analytics
                {isLive && (
                   <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                     </span>
                    Live
                  </span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground">
                Translation pipeline performance and query insights
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Select value={days} onValueChange={setDays}>
                <SelectTrigger className="w-[120px] h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Last 24h</SelectItem>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              {data && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCsv(data)}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={fetchAnalytics}
                disabled={isLoading}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {isLoading && !data ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : data ? (
            <div className="space-y-8">
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <StatCard
                  icon={TrendingUp}
                  label="Total Searches"
                  value={data.summary.totalSearches.toLocaleString()}
                  subtext={`Last ${data.summary.days} days`}
                />
                <StatCard
                  icon={Target}
                  label="Avg Confidence"
                  value={`${Math.round(data.summary.avgConfidence * 100)}%`}
                  variant={data.summary.avgConfidence >= 0.8 ? 'success' : data.summary.avgConfidence >= 0.6 ? 'warning' : 'danger'}
                />
                <StatCard
                  icon={Clock}
                  label="Avg Response"
                  value={`${data.summary.avgResponseTime}ms`}
                  variant={data.summary.avgResponseTime < 1000 ? 'success' : 'warning'}
                />
                <StatCard
                  icon={AlertTriangle}
                  label="Fallback Rate"
                  value={`${data.summary.fallbackRate}%`}
                  variant={data.summary.fallbackRate < 10 ? 'success' : data.summary.fallbackRate < 25 ? 'warning' : 'danger'}
                />
              </div>

              {/* Response time percentiles */}
              {data.responsePercentiles && (
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  <StatCard
                    icon={Gauge}
                    label="P50 Response"
                    value={`${data.responsePercentiles.p50}ms`}
                    subtext="Median"
                    variant={data.responsePercentiles.p50 < 500 ? 'success' : 'warning'}
                  />
                  <StatCard
                    icon={Gauge}
                    label="P95 Response"
                    value={`${data.responsePercentiles.p95}ms`}
                    subtext="95th percentile"
                    variant={data.responsePercentiles.p95 < 2000 ? 'success' : data.responsePercentiles.p95 < 5000 ? 'warning' : 'danger'}
                  />
                  <StatCard
                    icon={Gauge}
                    label="P99 Response"
                    value={`${data.responsePercentiles.p99}ms`}
                    subtext="99th percentile"
                    variant={data.responsePercentiles.p99 < 5000 ? 'success' : 'danger'}
                  />
                </div>
              )}

              {/* Source breakdown + confidence */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Source breakdown */}
                <div className="surface-elevated p-5 border border-border">
                  <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Translation Source
                  </h2>
                  <div className="space-y-3">
                    {Object.entries(data.sourceBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([source, count]) => (
                        <BarRow
                          key={source}
                          label={source}
                          value={count}
                          total={data.summary.totalSearches}
                          color={
                            source === 'deterministic' ? 'bg-success'
                            : source === 'cache' ? 'bg-primary'
                            : source === 'ai' ? 'bg-accent'
                            : source === 'pattern_match' ? 'bg-success/70'
                            : 'bg-warning'
                          }
                        />
                      ))}
                  </div>
                </div>

                {/* Confidence distribution */}
                <div className="surface-elevated p-5 border border-border">
                  <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Confidence Distribution
                  </h2>
                  <div className="space-y-3">
                    <BarRow
                      label="High (≥80%)"
                      value={data.confidenceBuckets.high}
                      total={data.summary.totalSearches}
                      color="bg-success"
                    />
                    <BarRow
                      label="Medium (60-79%)"
                      value={data.confidenceBuckets.medium}
                      total={data.summary.totalSearches}
                      color="bg-warning"
                    />
                    <BarRow
                      label="Low (<60%)"
                      value={data.confidenceBuckets.low}
                      total={data.summary.totalSearches}
                      color="bg-destructive"
                    />
                  </div>
                </div>
              </div>

              {/* Deterministic Coverage Trend */}
              {Object.keys(data.deterministicCoverage).length > 1 && (
                <div className="surface-elevated p-5 border border-border">
                  <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Deterministic Coverage Trend
                  </h2>
                  <p className="text-xs text-muted-foreground mb-3">
                    Percentage of queries handled without AI (deterministic + pattern match)
                  </p>
                  <div className="space-y-2">
                    {Object.entries(data.deterministicCoverage)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([day, pct]) => (
                        <div key={day} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-20 tabular-nums flex-shrink-0">
                            {day}
                          </span>
                          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full bg-success/60 rounded"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                            {pct}%
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Daily volume */}
              <div className="surface-elevated p-5 border border-border">
                <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Daily Search Volume
                </h2>
                <div className="space-y-2">
                  {Object.entries(data.dailyVolume)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([day, count]) => {
                      const maxCount = Math.max(...Object.values(data.dailyVolume));
                      return (
                        <div key={day} className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground w-20 tabular-nums flex-shrink-0">
                            {day}
                          </span>
                          <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                            <div
                              className="h-full bg-primary/70 rounded"
                              style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Popular Queries */}
              {data.popularQueries && data.popularQueries.length > 0 && (
                <div className="surface-elevated p-5 border border-border">
                  <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <Search className="h-4 w-4" />
                    Popular Queries (Top 20)
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">#</th>
                          <th className="text-left py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Query</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Count</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Avg Conf</th>
                          <th className="text-right py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.popularQueries.map((pq, i) => (
                          <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                            <td className="py-2 text-muted-foreground tabular-nums">{i + 1}</td>
                            <td className="py-2 font-medium truncate max-w-[300px]">{pq.query}</td>
                            <td className="py-2 text-right tabular-nums">{pq.count}</td>
                            <td className="py-2 text-right">
                              <Badge
                                variant="secondary"
                                className={`text-[10px] ${
                                  pq.avg_confidence >= 0.8 ? 'bg-success/10 text-success'
                                  : pq.avg_confidence >= 0.6 ? 'bg-warning/10 text-warning'
                                  : 'bg-destructive/10 text-destructive'
                                }`}
                              >
                                {Math.round(pq.avg_confidence * 100)}%
                              </Badge>
                            </td>
                            <td className="py-2 text-right text-xs text-muted-foreground">{pq.primary_source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Event type breakdown */}
              {Object.keys(data.eventBreakdown).length > 0 && (
                <div className="surface-elevated p-5 border border-border">
                  <h2 className="text-sm font-semibold text-foreground mb-4">
                    Event Types
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.eventBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([type, count]) => (
                        <Badge key={type} variant="secondary" className="text-xs gap-1.5 py-1">
                          {type}
                          <span className="text-muted-foreground tabular-nums">{count}</span>
                        </Badge>
                      ))}
                  </div>
                </div>
              )}

              {/* Low confidence queries */}
              {data.lowConfidenceQueries.length > 0 && (
                <div className="surface-elevated p-5 border border-border">
                  <h2 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-warning" />
                    Low Confidence Queries (for review)
                  </h2>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {data.lowConfidenceQueries.map((q, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/30 border border-border/50 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            "{q.query}"
                          </p>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] flex-shrink-0 ${
                              (q.confidence || 0) < 0.4 ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'
                            }`}
                          >
                            {Math.round((q.confidence || 0) * 100)}%
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono truncate">
                          → {q.translated}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{q.source}</span>
                          <span>·</span>
                          <span>{new Date(q.time).toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              No analytics data available
            </div>
          )}

          {/* ── Feedback Queue ── */}
          <div className="surface-elevated border border-border mt-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4 text-warning" />
                Feedback Queue
                {feedback.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {feedback.filter((f) => f.processing_status === 'pending' || f.processing_status == null).length} pending
                  </Badge>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <Select value={feedbackFilter} onValueChange={(v) => setFeedbackFilter(v as FeedbackFilter)}>
                  <SelectTrigger className="h-8 w-[140px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="skipped">Skipped</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={fetchFeedback} disabled={feedbackLoading} className="h-8 w-8 p-0">
                  <RefreshCw className={`h-3.5 w-3.5 ${feedbackLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {feedbackLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (() => {
              const filtered = feedback.filter((f) => {
                const s = f.processing_status ?? 'pending';
                if (feedbackFilter === 'all') return true;
                if (feedbackFilter === 'completed') return s === 'completed' || s === 'updated_existing' || s === 'done';
                return s === feedbackFilter;
              });

              if (filtered.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    {feedbackFilter === 'all' ? 'No feedback submitted yet' : `No ${feedbackFilter} items`}
                  </p>
                );
              }

              return (
                <div className="divide-y divide-border max-h-[640px] overflow-y-auto">
                  {filtered.map((f) => {
                    const status = f.processing_status ?? 'pending';
                    const isExpanded = expandedFeedback.has(f.id);
                    const rule = f.translation_rules;
                    const canRetrigger = status === 'failed' || status === 'skipped';
                    const isRetriggering = retriggeringId === f.id;
                    const isTogglingRule = ruleTogglingId === f.id;

                    return (
                      <div key={f.id} id={`feedback-${f.id}`} className="px-5 py-4 space-y-3 scroll-mt-4">
                        {/* Row 1 — status + query + timestamp */}
                        <div className="flex items-start gap-3 flex-wrap sm:flex-nowrap">
                          <StatusBadge status={status} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              &ldquo;{f.original_query}&rdquo;
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {new Date(f.created_at).toLocaleString()}
                              {f.processed_at && (
                                <> · processed {new Date(f.processed_at).toLocaleDateString()}</>
                              )}
                            </p>
                          </div>
                          {/* Expand toggle */}
                          <button
                            onClick={() =>
                              setExpandedFeedback((prev) => {
                                const next = new Set(prev);
                                if (next.has(f.id)) next.delete(f.id); else next.add(f.id);
                                return next;
                              })
                            }
                            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </button>
                        </div>

                        {/* Row 2 — issue description (always visible) */}
                        <p className={`text-xs text-muted-foreground leading-relaxed ${isExpanded ? '' : 'line-clamp-2'}`}>
                          {f.issue_description}
                        </p>

                        {/* Row 3 — translated query (expanded only) */}
                        {isExpanded && f.translated_query && (
                          <div className="flex items-start gap-1.5 text-xs">
                            <Code2 className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground mt-0.5" />
                            <span className="font-mono text-muted-foreground break-all">{f.translated_query}</span>
                          </div>
                        )}

                        {/* Row 4 — AI-generated rule box */}
                        {rule && (
                          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                              <Sparkles className="h-3 w-3" />
                              AI-Generated Rule
                              {/* Confidence badge */}
                              {rule.confidence != null && (
                                <Badge
                                  variant="secondary"
                                  className={`ml-auto text-[10px] ${
                                    rule.confidence >= 0.8
                                      ? 'bg-success/10 text-success'
                                      : rule.confidence >= 0.6
                                      ? 'bg-warning/10 text-warning'
                                      : 'bg-destructive/10 text-destructive'
                                  }`}
                                >
                                  {Math.round(rule.confidence * 100)}% conf
                                </Badge>
                              )}
                            </div>
                            <div className="space-y-1">
                              <div className="flex gap-2 text-xs">
                                <span className="text-muted-foreground flex-shrink-0 w-14">Pattern</span>
                                <span className="text-foreground font-medium break-words">{rule.pattern}</span>
                              </div>
                              <div className="flex gap-2 text-xs">
                                <span className="text-muted-foreground flex-shrink-0 w-14">Syntax</span>
                                <span className="font-mono text-foreground break-all">{rule.scryfall_syntax}</span>
                              </div>
                              {rule.description && (
                                <div className="flex gap-2 text-xs">
                                  <span className="text-muted-foreground flex-shrink-0 w-14">Note</span>
                                  <span className="text-muted-foreground">{rule.description}</span>
                                </div>
                              )}
                            </div>

                            {/* Approve / Reject */}
                            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/50">
                              <span className={`text-[10px] font-medium ${rule.is_active ? 'text-success' : 'text-muted-foreground'}`}>
                                {rule.is_active ? 'Active' : 'Inactive'}
                              </span>
                              {rule.is_active ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                                  disabled={isTogglingRule}
                                  onClick={() => toggleRuleActive(f.id, f.generated_rule_id!, true)}
                                >
                                  {isTogglingRule ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] gap-1 border-success/40 text-success hover:bg-success/10"
                                  disabled={isTogglingRule}
                                  onClick={() => toggleRuleActive(f.id, f.generated_rule_id!, false)}
                                >
                                  {isTogglingRule ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                  Activate
                                </Button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Row 5 — actions */}
                        {canRetrigger && (
                          <div className="flex justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                              disabled={isRetriggering}
                              onClick={() => retriggerFeedback(f.id)}
                            >
                              {isRetriggering
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <RotateCcw className="h-3.5 w-3.5" />}
                              Re-process
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* ── Translation Rules Management ── */}
          <div className="surface-elevated border border-border mt-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-wrap gap-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Translation Rules
                {rules.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {rules.filter((r) => r.is_active).length} active / {rules.length} total
                  </Badge>
                )}
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={rulesSearch}
                    onChange={(e) => setRulesSearch(e.target.value)}
                    placeholder="Filter pattern / syntax…"
                    className="h-8 pl-6 pr-3 text-xs rounded-md border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring w-52"
                  />
                </div>
                {/* Active filter */}
                <Select value={rulesFilter} onValueChange={(v) => setRulesFilter(v as RulesFilter)}>
                  <SelectTrigger className="h-8 w-[110px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={fetchRules} disabled={rulesLoading} className="h-8 w-8 p-0">
                  <RefreshCw className={`h-3.5 w-3.5 ${rulesLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {rulesLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (() => {
              const filtered = rules.filter((r) => {
                const matchesFilter =
                  rulesFilter === 'all' ||
                  (rulesFilter === 'active' && r.is_active) ||
                  (rulesFilter === 'inactive' && !r.is_active);
                const q = rulesSearch.trim().toLowerCase();
                const matchesSearch =
                  !q ||
                  r.pattern.toLowerCase().includes(q) ||
                  r.scryfall_syntax.toLowerCase().includes(q) ||
                  (r.description ?? '').toLowerCase().includes(q);
                return matchesFilter && matchesSearch;
              });

              if (filtered.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-10">
                    {rules.length === 0
                      ? 'No translation rules yet — they are generated when feedback is processed'
                      : 'No rules match your filter'}
                  </p>
                );
              }

              return (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-background border-b border-border z-10">
                      <tr>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider w-5"></th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Pattern</th>
                        <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Scryfall Syntax</th>
                        <th className="text-center px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Conf</th>
                        <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Added</th>
                        <th className="text-left px-3 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Source</th>
                        <th className="text-right px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {filtered.map((rule) => {
                        const isToggling = ruleDirectTogglingId === rule.id;
                        return (
                          <tr
                            key={rule.id}
                            className={`hover:bg-muted/20 transition-colors ${!rule.is_active ? 'opacity-60' : ''}`}
                          >
                            {/* Active indicator dot */}
                            <td className="px-5 py-3">
                              <span
                                className={`inline-flex h-2 w-2 rounded-full ${rule.is_active ? 'bg-success' : 'bg-muted-foreground/40'}`}
                                title={rule.is_active ? 'Active' : 'Inactive'}
                              />
                            </td>
                            {/* Pattern */}
                            <td className="px-5 py-3 max-w-[200px]">
                              <p className="font-medium text-foreground text-xs truncate" title={rule.pattern}>
                                {rule.pattern}
                              </p>
                              {rule.description && (
                                <p className="text-[10px] text-muted-foreground truncate mt-0.5" title={rule.description}>
                                  {rule.description}
                                </p>
                              )}
                            </td>
                            {/* Scryfall syntax */}
                            <td className="px-5 py-3 max-w-[220px]">
                              <code className="text-[11px] font-mono text-foreground/80 break-all line-clamp-2" title={rule.scryfall_syntax}>
                                {rule.scryfall_syntax}
                              </code>
                            </td>
                            {/* Confidence */}
                            <td className="px-3 py-3 text-center">
                              {rule.confidence != null ? (
                                <Badge
                                  variant="secondary"
                                  className={`text-[10px] ${
                                    rule.confidence >= 0.8
                                      ? 'bg-success/10 text-success'
                                      : rule.confidence >= 0.6
                                      ? 'bg-warning/10 text-warning'
                                      : 'bg-destructive/10 text-destructive'
                                  }`}
                                >
                                  {Math.round(rule.confidence * 100)}%
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[10px]">—</span>
                              )}
                            </td>
                            {/* Created at */}
                            <td className="px-3 py-3 text-[10px] text-muted-foreground whitespace-nowrap">
                              {new Date(rule.created_at).toLocaleDateString()}
                            </td>
                            {/* Source feedback link */}
                            <td className="px-3 py-3">
                              {rule.source_feedback_id ? (
                                <button
                                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline"
                                  onClick={() => {
                                    // Scroll feedback queue into view and highlight the item
                                    document.getElementById(`feedback-${rule.source_feedback_id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    setExpandedFeedback((prev) => {
                                      const next = new Set(prev);
                                      next.add(rule.source_feedback_id!);
                                      return next;
                                    });
                                  }}
                                  title="Jump to source feedback"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Feedback
                                </button>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Manual</span>
                              )}
                            </td>
                            {/* Toggle */}
                            <td className="px-5 py-3 text-right">
                              {rule.is_active ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] gap-1 border-destructive/40 text-destructive hover:bg-destructive/10"
                                  disabled={isToggling}
                                  onClick={() => toggleRuleDirect(rule.id, true)}
                                >
                                  {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                                  Deactivate
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-6 px-2 text-[10px] gap-1 border-success/40 text-success hover:bg-success/10"
                                  disabled={isToggling}
                                  onClick={() => toggleRuleDirect(rule.id, false)}
                                >
                                  {isToggling ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                                  Activate
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

/** Color-coded status badge for the feedback pipeline lifecycle. */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending:          { label: 'Pending',          className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    processing:       { label: 'Processing',       className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    completed:        { label: 'Completed',        className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30' },
    updated_existing: { label: 'Updated',          className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30' },
    done:             { label: 'Resolved',         className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30' },
    failed:           { label: 'Failed',           className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30' },
    skipped:          { label: 'Skipped',          className: 'bg-muted text-muted-foreground border-border' },
    duplicate:        { label: 'Duplicate',        className: 'bg-muted text-muted-foreground border-border' },
    archived:         { label: 'Archived',         className: 'bg-muted text-muted-foreground border-border' },
  };
  const { label, className } = map[status] ?? { label: status, className: 'bg-muted text-muted-foreground border-border' };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold rounded-full border px-2 py-0.5 flex-shrink-0 ${className}`}>
      {status === 'processing' && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
      {label}
    </span>
  );
}

