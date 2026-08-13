/**
 * Opportunity scoring and Operations Inbox construction.
 *
 * Pure functions so the prioritisation logic is testable and deterministic:
 * the same signals always rank the same way.
 */

import type { QueryRepairItem } from '@/pages/admin-analytics/types';

export type InboxKind =
  | 'search-quality'
  | 'content'
  | 'seo'
  | 'performance'
  | 'system';

export type InboxAction = 'FIX' | 'REVIEW' | 'INSPECT' | 'INVESTIGATE';

export interface InboxItem {
  id: string;
  kind: InboxKind;
  title: string;
  detail: string;
  action: InboxAction;
  /** 0..100 — higher means fix this first. */
  score: number;
  /** Where the fix happens. */
  href: string;
}

export interface IntentOpportunity {
  signature: string;
  canonical_query: string;
  variant_count: number;
  search_count: number;
  searcher_count: number;
  zero_result_count: number;
  opportunity_score: number;
  suggested_slug: string;
  already_covered: boolean;
  last_seen_at: string | null;
}

const clamp = (n: number, min = 0, max = 100) => Math.max(min, Math.min(max, n));

/**
 * Demand-weighted failure score for a searched query.
 * High volume + low quality + zero results ranks highest.
 */
export function scoreQueryProblem(item: QueryRepairItem): number {
  const demand = Math.log10(1 + Math.max(item.total_searches, item.sample_size)) * 22;
  const failure = (1 - clamp(item.search_quality_score, 0, 1)) * 45;
  const zero = Math.min(item.no_results, 20) * 1.4;
  const churn = Math.min(item.refinements, 20) * 0.8;
  const reported = Math.min(item.feedback_reports, 5) * 4;
  const covered = item.has_active_rule ? -8 : 0;
  return clamp(Math.round(demand + failure + zero + churn + reported + covered));
}

/**
 * Content opportunity score: real demand for a concept that has no page.
 */
export function scoreContentOpportunity(opp: IntentOpportunity): number {
  const demand = Math.log10(1 + opp.search_count) * 24;
  const breadth = Math.min(opp.variant_count, 40) * 0.7;
  const people = Math.log10(1 + opp.searcher_count) * 14;
  const gap = opp.already_covered ? -30 : 18;
  const broken = Math.min(opp.zero_result_count, 20) * 0.6;
  return clamp(Math.round(demand + breadth + people + gap + broken));
}

export interface InboxInputs {
  repairQueue: readonly QueryRepairItem[];
  opportunities: readonly IntentOpportunity[];
  criticalErrors: number;
  staleJobs: readonly string[];
  clsRegressionRoute?: string | null;
}

export function buildOperationsInbox(inputs: InboxInputs): InboxItem[] {
  const items: InboxItem[] = [];

  for (const q of inputs.repairQueue) {
    items.push({
      id: `search:${q.normalized_query}`,
      kind: 'search-quality',
      title: q.display_query,
      detail: `${q.total_searches} searches · ${q.no_results} zero-result · quality ${Math.round(
        q.search_quality_score * 100,
      )}%`,
      action: 'FIX',
      score: scoreQueryProblem(q),
      href: `/admin/search/lab?q=${encodeURIComponent(q.normalized_query)}`,
    });
  }

  for (const opp of inputs.opportunities) {
    const score = scoreContentOpportunity(opp);
    items.push({
      id: `intent:${opp.signature}`,
      kind: opp.already_covered ? 'content' : 'seo',
      title: opp.canonical_query,
      detail: `${opp.search_count} searches / ${opp.variant_count} phrasings · ${
        opp.already_covered ? 'page exists' : `no page (${opp.suggested_slug})`
      }`,
      action: opp.already_covered ? 'REVIEW' : 'INSPECT',
      score,
      href: opp.already_covered
        ? `/admin/knowledge/clusters?signature=${encodeURIComponent(opp.signature)}`
        : `/admin/content/opportunities?signature=${encodeURIComponent(opp.signature)}`,
    });
  }

  if (inputs.criticalErrors > 0) {
    items.push({
      id: 'system:errors',
      kind: 'system',
      title: `${inputs.criticalErrors} unresolved critical errors`,
      detail: 'Error monitor has open items that auto-fix could not clear',
      action: 'INVESTIGATE',
      score: 92,
      href: '/admin/overview/alerts',
    });
  }

  for (const job of inputs.staleJobs) {
    items.push({
      id: `system:stale:${job}`,
      kind: 'system',
      title: `${job} is stale`,
      detail: 'Scheduled job has not produced fresh data inside its window',
      action: 'INVESTIGATE',
      score: 74,
      href: '/admin/system/api-health',
    });
  }

  if (inputs.clsRegressionRoute) {
    items.push({
      id: 'perf:cls',
      kind: 'performance',
      title: `CLS regression on ${inputs.clsRegressionRoute}`,
      detail: 'Layout shift above the 0.1 good threshold for real users',
      action: 'INVESTIGATE',
      score: 70,
      href: '/admin/system/performance',
    });
  }

  return items.sort((a, b) => b.score - a.score);
}

export const KIND_LABEL: Record<InboxKind, string> = {
  'search-quality': 'SEARCH QUALITY',
  content: 'CONTENT',
  seo: 'SEO',
  performance: 'PERFORMANCE',
  system: 'SYSTEM',
};
