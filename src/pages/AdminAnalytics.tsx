import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BarChart3,
  Download,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { SkipLinks } from '@/components/SkipLinks';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAdminAnalyticsData } from '@/hooks/useAdminAnalyticsData';
import { useAdminAnalyticsFilters } from '@/hooks/useAdminAnalyticsFilters';
import { useAuth } from '@/hooks/useAuth';
import { useFeedbackQueue } from '@/hooks/useFeedbackQueue';
import { useTranslationRulesAdmin } from '@/hooks/useTranslationRulesAdmin';
import { useUserRole } from '@/hooks/useUserRole';
import { AdminAnalyticsDashboard } from '@/pages/admin-analytics/components/AdminAnalyticsDashboard';
import { FeedbackQueuePanel } from '@/pages/admin-analytics/components/FeedbackQueuePanel';
import { PipelineHealthIndicator } from '@/pages/admin-analytics/components/PipelineHealthIndicator';
import { TranslationRulesPanel } from '@/pages/admin-analytics/components/TranslationRulesPanel';
import { exportToCsv } from '@/pages/admin-analytics/utils/exportCsv';

export default function AdminAnalytics() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasRole: isAdmin, isLoading: roleLoading } = useUserRole('admin');
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !isAdmin)) {
      navigate('/', { replace: true });
    }
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

  const analytics = useAdminAnalyticsData(Boolean(user && isAdmin));
  const rulesAdmin = useTranslationRulesAdmin({
    enabled: Boolean(user && isAdmin),
  });
  const feedbackQueue = useFeedbackQueue({
    enabled: Boolean(user && isAdmin),
    onRulePatched: (ruleId, patch) => {
      rulesAdmin.patchRuleLocally(
        ruleId,
        patch as {
          is_active?: boolean;
          scryfall_syntax?: string;
          archived_at?: string | null;
        },
      );
    },
  });

  const filters = useAdminAnalyticsFilters({
    feedback: feedbackQueue.feedback,
    feedbackFilter: feedbackQueue.feedbackFilter,
    rules: rulesAdmin.rules,
    rulesFilter: rulesAdmin.rulesFilter,
    rulesSearch: rulesAdmin.rulesSearch,
  });

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

  if (!user || !isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative">
      <div
        className="fixed inset-0 pointer-events-none bg-page-gradient"
        aria-hidden="true"
      />
      <div
        className="fixed inset-0 pointer-events-none bg-page-noise"
        aria-hidden="true"
      />
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
              <Select value={analytics.days} onValueChange={analytics.setDays}>
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
              {analytics.data && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportToCsv(analytics.data)}
                  className="gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={analytics.fetchAnalytics}
                disabled={analytics.isLoading}
                className="gap-1.5"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${analytics.isLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>
          </div>

          {analytics.isLoading && !analytics.data ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : analytics.data ? (
            <AdminAnalyticsDashboard
              data={analytics.data}
              days={Number(analytics.days)}
            />
          ) : (
            <div className="text-center py-20 text-muted-foreground">
              No analytics data available
            </div>
          )}

          <FeedbackQueuePanel
            feedbackLoading={feedbackQueue.feedbackLoading}
            feedbackFilter={feedbackQueue.feedbackFilter}
            setFeedbackFilter={feedbackQueue.setFeedbackFilter}
            filteredFeedback={filters.filteredFeedback}
            pendingFeedbackCount={filters.pendingFeedbackCount}
            archivedFeedbackCount={filters.archivedFeedbackCount}
            processAllPending={feedbackQueue.processAllPending}
            processingAllPending={feedbackQueue.processingAllPending}
            fetchFeedback={feedbackQueue.fetchFeedback}
            ruleTogglingId={feedbackQueue.ruleTogglingId}
            retriggeringId={feedbackQueue.retriggeringId}
            toggleRuleActive={feedbackQueue.toggleRuleActive}
            retriggerFeedback={feedbackQueue.retriggerFeedback}
          />

          <TranslationRulesPanel
            rules={rulesAdmin.rules}
            filteredRules={filters.filteredRules}
            rulesLoading={rulesAdmin.rulesLoading}
            rulesFilter={rulesAdmin.rulesFilter}
            setRulesFilter={rulesAdmin.setRulesFilter}
            rulesSearch={rulesAdmin.rulesSearch}
            setRulesSearch={rulesAdmin.setRulesSearch}
            showArchivedRules={rulesAdmin.showArchivedRules}
            setShowArchivedRules={rulesAdmin.setShowArchivedRules}
            activeRulesCount={filters.activeRulesCount}
            nonArchivedRulesCount={filters.nonArchivedRulesCount}
            archivedRulesCount={filters.archivedRulesCount}
            ruleDirectTogglingId={rulesAdmin.ruleDirectTogglingId}
            archivingRuleId={rulesAdmin.archivingRuleId}
            editValidating={rulesAdmin.editValidating}
            editSaving={rulesAdmin.editSaving}
            editValidationError={rulesAdmin.editValidationError}
            editValidationCount={rulesAdmin.editValidationCount}
            setEditValidationError={rulesAdmin.setEditValidationError}
            setEditValidationCount={rulesAdmin.setEditValidationCount}
            fetchRules={rulesAdmin.fetchRules}
            toggleRuleDirect={rulesAdmin.toggleRuleDirect}
            archiveRule={rulesAdmin.archiveRule}
            validateAndSaveRuleSyntax={rulesAdmin.validateAndSaveRuleSyntax}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
}
