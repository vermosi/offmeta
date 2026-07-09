/**
 * Admin Analytics Dashboard
 *
 * Protected page (`user_roles.role = 'admin'` required) that surfaces
 * aggregated search pipeline telemetry and a full feedback queue panel.
 *
 * Delegates data management to `useAdminAnalyticsData` and rendering to:
 * - `AnalyticsChartsSection` — summary stats, charts, source/confidence breakdowns
 * - `FeedbackQueuePanel` — feedback queue with status badges and inline rule display
 * - `TranslationRulesPanel` — rule management table with inline editing
 *
 * @see src/hooks/useAdminAnalyticsData.ts
 * @see src/pages/admin-analytics/components/AnalyticsChartsSection.tsx
 * @see src/pages/admin-analytics/components/TranslationRulesPanel.tsx
 */

import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Loader2,
  ArrowLeft,
  BarChart3,
  Download,
  RefreshCw,
  FileText,
  AlertTriangle,
  ArrowUpRight,
  Copy,
  Pencil,
  Search,
  Sparkles,
  Target,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SkipLinks } from '@/components/SkipLinks';
import { useAuth, useUserRole, useAdminAnalyticsData } from '@/hooks';
import { PipelineHealthIndicator } from '@/pages/admin-analytics/components/PipelineHealthIndicator';
import { AnalyticsChartsSection } from '@/pages/admin-analytics/components/AnalyticsChartsSection';
import { FeedbackQueuePanel } from '@/pages/admin-analytics/components/FeedbackQueuePanel';
import { TranslationRulesPanel } from '@/pages/admin-analytics/components/TranslationRulesPanel';
import { exportToCsv } from '@/pages/admin-analytics/utils/exportCsv';

export default function AdminAnalytics() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasRole: isAdmin, isLoading: roleLoading } = useUserRole('admin');
  const navigate = useNavigate();

  const hook = useAdminAnalyticsData(user, isAdmin);

  useEffect(() => {
    if (!authLoading && !roleLoading) {
      if (!user || !isAdmin) {
        navigate('/', { replace: true });
      }
    }
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

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

          {/* Page header with controls */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Search Analytics
                {hook.isLive && (
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
              <PipelineHealthIndicator />
              <Link
                to="/admin/curated-searches"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
              >
                <FileText className="h-3.5 w-3.5" />
                Manage Curated Searches →
              </Link>
              <Link
                to="/admin/seo-pages"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors mt-1"
              >
                <FileText className="h-3.5 w-3.5" />
                AI SEO Pages →
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <Select value={hook.days} onValueChange={hook.setDays}>
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
              {hook.data && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCsv(hook.data!)}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={hook.fetchAnalytics}
                disabled={hook.isLoading}
                className="gap-1.5"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${hook.isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>

          {hook.repairQueue.length > 0 && (
            <section className="surface-elevated border border-border p-5 mb-8">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    Search Quality Repair Queue
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Rank the queries that most need fixes, then open a row to inspect evidence and ship a rule.
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px]">
                  {hook.repairQueue.length} candidates
                </Badge>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {hook.repairQueue.slice(0, 6).map((item, index) => (
                  <button
                    key={item.normalized_query}
                    onClick={() => void hook.fetchQueryDetail(item.normalized_query)}
                    className="text-left rounded-xl border border-border bg-background/50 p-4 hover:border-primary/40 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                          #{index + 1} query to fix
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">
                          {item.display_query}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {Math.round(item.search_quality_score * 100)}%
                      </Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                      <span>No-result {item.no_results}</span>
                      <span>Refinements {item.refinements}</span>
                      <span>Clicks {item.result_clicks}</span>
                      <span>Confidence {Math.round(item.confidence * 100)}%</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="grid gap-4 xl:grid-cols-2 mb-8">
            <section className="surface-elevated border border-border p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <TrendingDown className="h-4 w-4 text-destructive" />
                Lowest Quality Score Queries
              </h2>
              <div className="space-y-2 max-h-72 overflow-auto">
                {hook.repairQueue.slice(0, 8).map((item) => (
                  <button
                    key={item.normalized_query}
                    onClick={() => void hook.fetchQueryDetail(item.normalized_query)}
                    className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-sm font-medium truncate">{item.display_query}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {Math.round(item.search_quality_score * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            </section>

            <section className="surface-elevated border border-border p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Highest No-Result Queries
              </h2>
              <div className="space-y-2 max-h-72 overflow-auto">
                {[...hook.repairQueue]
                  .sort((a, b) => b.no_results - a.no_results)
                  .slice(0, 8)
                  .map((item) => (
                    <button
                      key={item.normalized_query}
                      onClick={() => void hook.fetchQueryDetail(item.normalized_query)}
                      className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm font-medium truncate">{item.display_query}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{item.no_results}</span>
                    </button>
                  ))}
              </div>
            </section>

            <section className="surface-elevated border border-border p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <ArrowUpRight className="h-4 w-4 text-primary" />
                Most-Refined Queries
              </h2>
              <div className="space-y-2 max-h-72 overflow-auto">
                {[...hook.repairQueue]
                  .sort((a, b) => b.refinements - a.refinements)
                  .slice(0, 8)
                  .map((item) => (
                    <button
                      key={item.normalized_query}
                      onClick={() => void hook.fetchQueryDetail(item.normalized_query)}
                      className="w-full flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-left hover:bg-muted/30 transition-colors"
                    >
                      <span className="text-sm font-medium truncate">{item.display_query}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{item.refinements}</span>
                    </button>
                  ))}
              </div>
            </section>

            <section className="surface-elevated border border-border p-5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-accent" />
                Low-Confidence AI Fallback Queries
              </h2>
              <div className="space-y-2 max-h-72 overflow-auto">
                {hook.data?.lowConfidenceQueries.slice(0, 8).map((item) => (
                  <div key={`${item.query}-${item.time}`} className="rounded-lg border border-border px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{item.query}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {Math.round(item.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate mt-1">
                      {item.translated}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Analytics charts */}
          {hook.isLoading && !hook.data ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : hook.data ? (
            <AnalyticsChartsSection data={hook.data} days={Number(hook.days)} />
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              No analytics data available
            </div>
          )}

          {/* Feedback queue */}
          <FeedbackQueuePanel
            pendingFeedbackCount={hook.pendingFeedbackCount}
            archivedFeedbackCount={hook.archivedFeedbackCount}
            processAllPending={hook.processAllPending}
            processingAllPending={hook.processingAllPending}
            feedbackFilter={hook.feedbackFilter}
            onFeedbackFilterChange={hook.setFeedbackFilter}
            onRefresh={hook.fetchFeedback}
            feedbackLoading={hook.feedbackLoading}
            filteredFeedback={hook.filteredFeedback}
            expandedFeedback={hook.expandedFeedback}
            setExpandedFeedback={hook.setExpandedFeedback}
            retriggeringId={hook.retriggeringId}
            ruleTogglingId={hook.ruleTogglingId}
            onRetriggerFeedback={hook.retriggerFeedback}
            onToggleRuleActive={hook.toggleRuleActive}
          />

          {/* Translation rules */}
          <TranslationRulesPanel
            rules={hook.rules}
            filteredRules={hook.filteredRules}
            rulesLoading={hook.rulesLoading}
            rulesFilter={hook.rulesFilter}
            rulesSearch={hook.rulesSearch}
            showArchivedRules={hook.showArchivedRules}
            activeRulesCount={hook.activeRulesCount}
            nonArchivedRulesCount={hook.nonArchivedRulesCount}
            archivedRulesCount={hook.archivedRulesCount}
            ruleDirectTogglingId={hook.ruleDirectTogglingId}
            archivingRuleId={hook.archivingRuleId}
            editingRuleId={hook.editingRuleId}
            editingSyntax={hook.editingSyntax}
            editValidating={hook.editValidating}
            editSaving={hook.editSaving}
            editValidationError={hook.editValidationError}
            editValidationCount={hook.editValidationCount}
            onRulesFilterChange={hook.setRulesFilter}
            onRulesSearchChange={hook.setRulesSearch}
            onToggleShowArchived={hook.toggleShowArchivedRules}
            onRefresh={() => hook.fetchRules()}
            onToggleRuleDirect={hook.toggleRuleDirect}
            onArchiveRule={hook.archiveRule}
            onValidateAndSave={hook.validateAndSaveRuleSyntax}
            onCancelEdit={hook.cancelEditRule}
            onStartEdit={(ruleId, syntax) => {
              hook.setEditingRuleId(ruleId);
              hook.setEditingSyntax(syntax);
              hook.setEditValidationError(null);
              hook.setEditValidationCount(null);
            }}
            onEditingSyntaxChange={(syntax) => {
              hook.setEditingSyntax(syntax);
              hook.setEditValidationError(null);
              hook.setEditValidationCount(null);
            }}
            onExpandFeedback={(feedbackId) => {
              hook.setExpandedFeedback((prev) => {
                const next = new Set(prev);
                next.add(feedbackId);
                return next;
              });
            }}
          />
        </div>
      </main>

      <Sheet open={hook.queryDetailOpen} onOpenChange={hook.setQueryDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{hook.queryDetail?.display_query ?? 'Query details'}</SheetTitle>
            <SheetDescription>
              Repair evidence, recent outcomes, and the rule draft for this query.
            </SheetDescription>
          </SheetHeader>

          {hook.queryDetailLoading || !hook.queryDetail ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Quality</div>
                  <div className="text-lg font-semibold">{Math.round(hook.queryDetail.search_quality_score * 100)}%</div>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Confidence</div>
                  <div className="text-lg font-semibold">{Math.round(hook.queryDetail.confidence * 100)}%</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-border p-3">No results: {hook.queryDetail.no_results}</div>
                <div className="rounded-lg border border-border p-3">Refinements: {hook.queryDetail.refinements}</div>
                <div className="rounded-lg border border-border p-3">Clicks: {hook.queryDetail.result_clicks}</div>
                <div className="rounded-lg border border-border p-3">Feedback: {hook.queryDetail.feedback_reports}</div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Golden test fixture</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 gap-1.5"
                    onClick={() => hook.copyGoldenTestFixture(hook.queryDetail!.normalized_query)}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy golden test fixture
                  </Button>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs font-mono break-all">
                  {JSON.stringify(
                    {
                      query: hook.queryDetail.normalized_query,
                      expectedTranslation: hook.queryDetail.rules[0]?.scryfall_syntax ?? '',
                    },
                    null,
                    2,
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Create / edit translation rule</h3>
                </div>
                <div className="grid gap-3">
                  <Input
                    defaultValue={hook.queryDetail.rules[0]?.pattern ?? hook.queryDetail.normalized_query}
                    placeholder="Pattern"
                    id="repair-pattern"
                  />
                  <Textarea
                    defaultValue={hook.queryDetail.rules[0]?.scryfall_syntax ?? ''}
                    placeholder="Scryfall syntax"
                    id="repair-syntax"
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => {
                    const pattern = (document.getElementById('repair-pattern') as HTMLInputElement | null)?.value ?? hook.queryDetail!.normalized_query;
                    const scryfallSyntax = (document.getElementById('repair-syntax') as HTMLTextAreaElement | null)?.value ?? '';
                    void hook.createOrEditTranslationRule({
                      id: hook.queryDetail.rules[0]?.id,
                      pattern,
                      scryfall_syntax: scryfallSyntax,
                      description: `Repair workflow for ${hook.queryDetail!.normalized_query}`,
                      confidence: hook.queryDetail.confidence,
                      is_active: true,
                    });
                  }}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Save through admin-safe path
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Existing translation rules</h3>
                <div className="space-y-2">
                  {hook.queryDetail.rules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No matching rules yet.</p>
                  ) : (
                    hook.queryDetail.rules.map((rule) => (
                      <div key={rule.id} className="rounded-lg border border-border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">{rule.pattern}</p>
                          <Badge variant="secondary" className="text-[10px]">
                            {rule.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono break-all mt-1">
                          {rule.scryfall_syntax}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Recent outcomes</h3>
                <div className="space-y-2 max-h-56 overflow-auto">
                  {hook.queryDetail.recentOutcomes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No recent outcomes recorded.</p>
                  ) : (
                    hook.queryDetail.recentOutcomes.map((event) => (
                      <div key={`${event.event_type}-${event.created_at}`} className="rounded-lg border border-border p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{event.event_type}</span>
                          <span className="text-xs text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
                        </div>
                        {event.time_to_click_ms != null && (
                          <p className="text-xs text-muted-foreground mt-1">{event.time_to_click_ms} ms to click</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Footer />
    </div>
  );
}
