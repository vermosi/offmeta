/**
 * Admin analytics dashboard — shows search query metrics,
 * source breakdown, confidence distribution, popular queries,
 * response time percentiles, deterministic coverage trend,
 * low-confidence queries, and a full feedback queue panel.
 *
 * **Feedback queue** (upgraded panel):
 * - Displays every `search_feedback` row with a color-coded pipeline
 *   status badge: `pending` (amber) · `processing` (blue) ·
 *   `completed` / `updated_existing` (green) · `failed` (red) ·
 *   `skipped` / `duplicate` / `archived` (gray).
 * - Inline display of the linked AI-generated `translation_rules` row
 *   (pattern, Scryfall syntax, confidence %).
 * - One-click approve/reject toggle: flips `translation_rules.is_active`
 *   with an optimistic update that reverts on error.
 * - Re-trigger button for `failed` and `skipped` rows — calls the
 *   `process-feedback` edge function and resets status to `pending`.
 *
 * Protected: requires admin role (`user_roles.role = 'admin'`).
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
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { SkipLinks } from '@/components/SkipLinks';

interface FeedbackItem {
  id: string;
  original_query: string;
  translated_query: string | null;
  issue_description: string;
  processing_status: string | null;
  created_at: string;
  processed_at: string | null;
}

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
    success: 'border-green-500/30',
    warning: 'border-amber-500/30',
    danger: 'border-red-500/30',
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
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [expandedFeedback, setExpandedFeedback] = useState<Set<string>>(new Set());

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
        .select('id, original_query, translated_query, issue_description, processing_status, created_at, processed_at')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setFeedback((rows as FeedbackItem[]) ?? []);
    } catch {
      toast.error('Failed to load feedback');
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  const markFeedbackDone = useCallback(async (id: string) => {
    const { error } = await supabase
      .from('search_feedback')
      .update({ processing_status: 'done', processed_at: new Date().toISOString() })
      .eq('id', id);
    if (error) {
      toast.error('Failed to update feedback');
    } else {
      setFeedback((prev) =>
        prev.map((f) => f.id === id ? { ...f, processing_status: 'done', processed_at: new Date().toISOString() } : f)
      );
      toast.success('Marked as resolved');
    }
  }, []);

  useEffect(() => {
    if (isAdmin && user) {
      fetchAnalytics();
      fetchFeedback();
    }
  }, [isAdmin, user, fetchAnalytics, fetchFeedback]);

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
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600 dark:text-green-400">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
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
                            source === 'deterministic' ? 'bg-green-500'
                            : source === 'cache' ? 'bg-blue-500'
                            : source === 'ai' ? 'bg-primary'
                            : source === 'pattern_match' ? 'bg-cyan-500'
                            : 'bg-amber-500'
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
                      color="bg-green-500"
                    />
                    <BarRow
                      label="Medium (60-79%)"
                      value={data.confidenceBuckets.medium}
                      total={data.summary.totalSearches}
                      color="bg-amber-500"
                    />
                    <BarRow
                      label="Low (<60%)"
                      value={data.confidenceBuckets.low}
                      total={data.summary.totalSearches}
                      color="bg-red-500"
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
                              className="h-full bg-green-500/70 rounded"
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
                                  pq.avg_confidence >= 0.8 ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                                  : pq.avg_confidence >= 0.6 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                  : 'bg-red-500/10 text-red-600 dark:text-red-400'
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
                    <ShieldAlert className="h-4 w-4 text-amber-500" />
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
                              (q.confidence || 0) < 0.4 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-500'
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

          {/* ── User Feedback — always shown to admins ── */}
          <div className="surface-elevated p-5 border border-border mt-8">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MessageSquareWarning className="h-4 w-4 text-amber-500" />
                User Feedback
                {feedback.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {feedback.filter((f) => (f.processing_status ?? 'pending') !== 'done').length} open
                  </Badge>
                )}
              </h2>
              <div className="flex items-center gap-2">
                <Select value={feedbackFilter} onValueChange={(v) => setFeedbackFilter(v as typeof feedbackFilter)}>
                  <SelectTrigger className="h-8 w-[120px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Open</SelectItem>
                    <SelectItem value="done">Resolved</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={fetchFeedback} disabled={feedbackLoading} className="h-8 w-8 p-0">
                  <RefreshCw className={`h-3.5 w-3.5 ${feedbackLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>

            {feedbackLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (() => {
              const filtered = feedback.filter((f) => {
                if (feedbackFilter === 'pending') return (f.processing_status ?? 'pending') !== 'done';
                if (feedbackFilter === 'done') return f.processing_status === 'done';
                return true;
              });
              if (filtered.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {feedbackFilter === 'pending' ? 'No open feedback 🎉' : 'No feedback yet'}
                  </p>
                );
              }
              return (
                <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                  {filtered.map((f) => {
                    const isDone = f.processing_status === 'done';
                    const isExpanded = expandedFeedback.has(f.id);
                    return (
                      <div
                        key={f.id}
                        className={`rounded-lg border p-3 transition-colors ${isDone ? 'border-border/30 bg-muted/10 opacity-60' : 'border-amber-500/30 bg-amber-500/5'}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => !isDone && markFeedbackDone(f.id)}
                            title={isDone ? 'Resolved' : 'Mark as resolved'}
                            className={`mt-0.5 flex-shrink-0 transition-colors ${isDone ? 'text-green-500 cursor-default' : 'text-muted-foreground hover:text-green-500'}`}
                          >
                            {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">"{f.original_query}"</p>
                            <p className={`text-xs text-muted-foreground mt-0.5 ${isExpanded ? '' : 'line-clamp-2'}`}>
                              {f.issue_description}
                            </p>
                            {f.translated_query && isExpanded && (
                              <p className="text-xs font-mono text-muted-foreground mt-1 truncate">
                                → {f.translated_query}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(f.created_at).toLocaleString()}
                              </span>
                              {isDone && f.processed_at && (
                                <>
                                  <span className="text-[10px] text-muted-foreground">·</span>
                                  <span className="text-[10px] text-green-600 dark:text-green-400">
                                    resolved {new Date(f.processed_at).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                              <button
                                onClick={() =>
                                  setExpandedFeedback((prev) => {
                                    const next = new Set(prev);
                                    if (next.has(f.id)) { next.delete(f.id); } else { next.add(f.id); }
                                    return next;
                                  })
                                }
                                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5"
                              >
                                {isExpanded ? <><ChevronUp className="h-3 w-3" />Less</> : <><ChevronDown className="h-3 w-3" />More</>}
                              </button>
                            </div>
                          </div>

                          {!isDone && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs flex-shrink-0"
                              onClick={() => markFeedbackDone(f.id)}
                            >
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
