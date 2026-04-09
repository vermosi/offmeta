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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

      <Footer />
    </div>
  );
}
