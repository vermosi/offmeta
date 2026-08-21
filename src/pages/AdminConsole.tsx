/**
 * OffMeta Admin Control Room.
 *
 * Not a dashboard: a work surface organised around four areas (Overview,
 * Search, Knowledge, System). The default view is the Operations Inbox, which
 * answers "what should I improve in OffMeta today?".
 *
 * Existing telemetry panels are reused verbatim; the reorganisation is in the
 * information architecture and the action-first framing, not in the data.
 */


import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { SkipLinks } from '@/components/SkipLinks';
import { useAuth, useUserRole, useAdminAnalyticsData } from '@/hooks';
import { useAdminOpsData } from '@/hooks/useAdminOpsData';
import { ADMIN_AREAS, resolveArea, resolveLegacyPath, resolveSection } from '@/pages/admin/nav';
import { OperationsInbox } from '@/pages/admin/sections/OperationsInbox';
import { SearchLab } from '@/pages/admin/sections/SearchLab';
import { ConceptManager } from '@/pages/admin/sections/ConceptManager';
import { OpportunityQueue } from '@/pages/admin/sections/OpportunityQueue';
import { QualityBenchmark } from '@/pages/admin/sections/QualityBenchmark';
import { ConfidenceMonitor } from '@/pages/admin/sections/ConfidenceMonitor';
import { ExperimentsSection, ReleasesSection } from '@/pages/admin/sections/ReleasesSection';
import { GuidesSection, LandingPagesSection } from '@/pages/admin/sections/ContentInventory';
import { ConsoleHeading, ConsolePanel, EmptyRow } from '@/pages/admin/components/console-ui';
import { AnalyticsChartsSection } from '@/pages/admin-analytics/components/AnalyticsChartsSection';
import { ErrorMonitorPanel } from '@/pages/admin-analytics/components/ErrorMonitorPanel';
import { SystemStatusPanel } from '@/pages/admin-analytics/components/SystemStatusPanel';
import { SelfHealPanel } from '@/pages/admin-analytics/components/SelfHealPanel';
import { TranslationRulesPanel } from '@/pages/admin-analytics/components/TranslationRulesPanel';
import { ConversionFunnelPanel } from '@/pages/admin-analytics/components/ConversionFunnelPanel';
import { EngagementMetricsPanel } from '@/pages/admin-analytics/components/EngagementMetricsPanel';
import { FeedbackQueuePanel } from '@/pages/admin-analytics/components/FeedbackQueuePanel';

import { HitRatePanel } from '@/pages/admin-analytics/components/HitRatePanel';
import { SemrushPanel } from '@/pages/admin-analytics/components/SemrushPanel';
import { RumPanel } from '@/pages/admin-analytics/components/RumPanel';
import { EdgeFunctionStatusPanel } from '@/pages/admin-analytics/components/EdgeFunctionStatusPanel';
import { EdgeFunctionTriggerPanel } from '@/pages/admin-analytics/components/EdgeFunctionTriggerPanel';
import { SeoHealthPanel } from '@/pages/admin-analytics/components/SeoHealthPanel';
import { AuthFailuresPanel } from '@/pages/admin-analytics/components/AuthFailuresPanel';

export default function AdminConsole() {
  const { user, isLoading: authLoading } = useAuth();
  const { hasRole: isAdmin, isLoading: roleLoading } = useUserRole('admin');
  const navigate = useNavigate();
  const { area: areaParam, section: sectionParam } = useParams();

  const area = resolveArea(areaParam);
  const section = resolveSection(area, sectionParam);

  const hook = useAdminAnalyticsData(user, isAdmin);
  const days = Number(hook.days);
  const ops = useAdminOpsData(isAdmin, days);

  const legacyPath = resolveLegacyPath(areaParam, sectionParam);

  useEffect(() => {
    if (legacyPath) {
      navigate(`/admin/${legacyPath}`, { replace: true });
    }
  }, [legacyPath, navigate]);

  useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !isAdmin)) {
      navigate('/', { replace: true });
    }
  }, [authLoading, roleLoading, user, isAdmin, navigate]);


  const refresh = () => {
    hook.fetchAnalytics();
    void ops.reload();
  };

  const body = useMemo(() => {
    const key = `${area.id}/${section.id}`;
    switch (key) {
      case 'overview/inbox':
        return (
          <OperationsInbox
            repairQueue={hook.repairQueue}
            opportunities={ops.opportunities}
            freshness={ops.freshness}
            metrics={ops.metrics}
            isLoading={ops.isLoading || hook.repairQueueLoading}
          />
        );
      case 'overview/product-health':
        return (
          <div className="space-y-6">
            <ConsoleHeading
              index="01"
              title="Product health"
              note="Usage, arrival → search → action, and returning searchers."
            />
            {hook.data ? (
              <AnalyticsChartsSection data={hook.data} days={days} />
            ) : (
              <ConsolePanel>
                <EmptyRow>No analytics data in this window.</EmptyRow>
              </ConsolePanel>
            )}
            <EngagementMetricsPanel days={days} />
            <ConversionFunnelPanel days={days} />
            <HitRatePanel days={days} />
          </div>
        );
      case 'overview/alerts':
        return (
          <div className="space-y-6">
            <ConsoleHeading index="01" title="Alerts" note="Exception-based: only what needs action." />
            <ErrorMonitorPanel />
            <SystemStatusPanel />
          </div>
        );

      case 'search/lab':
        return (
          <SearchLab
            repairQueue={hook.repairQueue}
            queryDetail={hook.queryDetail}
            queryDetailLoading={hook.queryDetailLoading}
            fetchQueryDetail={hook.fetchQueryDetail}
            copyGoldenTestFixture={hook.copyGoldenTestFixture}
          />
        );
      case 'search/repair':
        return (
          <div className="space-y-6">
            <ConsoleHeading
              index="02"
              title="Repair queue"
              note="Proposed fixes stay reviewable — returning cards is not approval."
            />
            <SelfHealPanel />
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
          </div>
        );
      case 'search/confidence':
        return <ConfidenceMonitor days={days} />;
      case 'search/benchmark':
        return <QualityBenchmark metrics={ops.metrics} analytics={hook.data} days={days} />;
      case 'search/rules':
        return (
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
            onRefresh={hook.fetchRules}
            onToggleRuleDirect={hook.toggleRuleDirect}
            onArchiveRule={hook.archiveRule}
            onStartEdit={(id, syntax) => {
              hook.setEditingRuleId(id);
              hook.setEditingSyntax(syntax);
              hook.setEditValidationError(null);
              hook.setEditValidationCount(null);
            }}
            onEditingSyntaxChange={(syntax) => {
              hook.setEditingSyntax(syntax);
              hook.setEditValidationError(null);
              hook.setEditValidationCount(null);
            }}
            onCancelEdit={hook.cancelEditRule}
            onValidateAndSave={hook.validateAndSaveRuleSyntax}
            onExpandFeedback={(feedbackId) => {
              hook.setExpandedFeedback((prev) => {
                const next = new Set(prev);
                next.add(feedbackId);
                return next;
              });
            }}
          />
        );

      case 'knowledge/concepts':
        return <ConceptManager mode="concepts" />;
      case 'knowledge/relationships':
        return <ConceptManager mode="relationships" />;
      case 'knowledge/approaches':
        return <ConceptManager mode="approaches" />;
      case 'knowledge/clusters':
        return (
          <OpportunityQueue
            opportunities={ops.opportunities}
            isLoading={ops.isLoading}
            mode="clusters"
          />
        );
      case 'knowledge/opportunities':
        return (
          <OpportunityQueue
            opportunities={ops.opportunities}
            isLoading={ops.isLoading}
            mode="content"
          />
        );
      case 'knowledge/inventory':
        return (
          <div className="space-y-6">
            <ConsoleHeading
              index="03"
              title="Content inventory"
              note="Declared entrances into search: landing pages, guides, curated searches."
            />
            <ConsolePanel>
              <div className="flex flex-wrap gap-3 font-mono text-[11px]">
                <Link to="/admin/curated-searches" className="text-primary hover:underline">
                  Manage curated searches →
                </Link>
                <Link to="/admin/seo-pages" className="text-primary hover:underline">
                  Manage generated SEO pages →
                </Link>
              </div>
            </ConsolePanel>
            <LandingPagesSection />
            <GuidesSection />
          </div>
        );

      case 'system/performance':
        return (
          <div className="space-y-6">
            <ConsoleHeading index="04" title="Performance" note="Regressions first, healthy metrics collapsed." />
            <RumPanel days={days} />
          </div>
        );
      case 'system/api-health':
        return (
          <div className="space-y-6">
            <ConsoleHeading index="04" title="API health" note="Edge functions, pipelines and SEO checks." />
            <EdgeFunctionStatusPanel />
            <EdgeFunctionTriggerPanel />
            <SeoHealthPanel />
          </div>
        );
      case 'system/visibility':
        return <SemrushPanel />;
      case 'system/releases':
        return <ReleasesSection />;
      case 'system/experiments':
        return <ExperimentsSection />;
      case 'system/logs':
        return (
          <div className="space-y-6">
            <ConsoleHeading index="04" title="Logs" note="Auth failures and raw telemetry." />
            <AuthFailuresPanel days={days} />
          </div>
        );

      default:
        return (
          <ConsolePanel>
            <EmptyRow>Section not found.</EmptyRow>
          </ConsolePanel>
        );
    }
  }, [area.id, section.id, hook, ops, days]);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-screen min-h-dvh flex-col bg-background">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </main>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return (
    <div className="flex min-h-screen min-h-dvh flex-col bg-background">
      <SkipLinks />
      <Header />

      <main id="main-content" className="flex-1 pb-16">
        <div className="border-b border-border">
          <div className="container-main flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-baseline gap-4">
              <span className="font-heading text-xs uppercase tracking-[0.24em] text-foreground">
                Control room
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {section.purpose}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Select value={hook.days} onValueChange={hook.setDays}>
                <SelectTrigger className="h-8 w-[110px] rounded-none font-mono text-[11px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">24 hours</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-none font-mono text-[10px] uppercase tracking-[0.18em]"
                onClick={refresh}
                disabled={hook.isLoading}
              >
                <RefreshCw className={`mr-1 h-3 w-3 ${hook.isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="border-b border-border">
          <nav
            aria-label="Admin areas"
            className="container-main flex gap-5 overflow-x-auto py-2"
          >
            {ADMIN_AREAS.map((a) => (
              <Link
                key={a.id}
                to={`/admin/${a.id}/${a.sections[0].id}`}
                className={`whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.24em] transition-colors ${
                  a.id === area.id ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {a.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="container-main grid gap-6 py-6 lg:grid-cols-[200px_minmax(0,1fr)]">
          <nav aria-label={`${area.label} sections`} className="space-y-1">
            {area.sections.map((s) => (
              <Link
                key={s.id}
                to={`/admin/${area.id}/${s.id}`}
                className={`block border-l-2 py-1 pl-3 text-xs transition-colors ${
                  s.id === section.id
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          <div className="min-w-0">{body}</div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
