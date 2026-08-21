/**
 * Admin control-room information architecture.
 *
 * Four areas, each holding action-oriented sections. Routing is
 * `/admin/:area/:section` with sensible defaults, so every view is linkable
 * from the Operations Inbox.
 *
 * Sections exist only where they answer a distinct question. Duplicated
 * surfaces (classification/concepts, retention/benchmark, acquisition/funnels)
 * were removed rather than aliased.
 */

export type AdminAreaId = 'overview' | 'search' | 'knowledge' | 'system';

export interface AdminSection {
  id: string;
  label: string;
  /** One-line description of the decision this section supports. */
  purpose: string;
}

export interface AdminArea {
  id: AdminAreaId;
  label: string;
  sections: readonly AdminSection[];
}

export const ADMIN_AREAS: readonly AdminArea[] = [
  {
    id: 'overview',
    label: 'Overview',
    sections: [
      { id: 'inbox', label: 'Operations Inbox', purpose: 'What should I improve today' },
      { id: 'product-health', label: 'Product Health', purpose: 'Usage, funnels and returning searchers' },
      { id: 'alerts', label: 'Alerts', purpose: 'Errors, pipelines and freshness' },
    ],
  },
  {
    id: 'search',
    label: 'Search',
    sections: [
      { id: 'lab', label: 'Search Lab', purpose: 'Diagnose a single query end to end' },
      { id: 'repair', label: 'Repair Queue', purpose: 'Feedback and human-in-the-loop rule review' },
      { id: 'confidence', label: 'Confidence Monitor', purpose: 'Live confidence per deploy and failing patterns' },
      { id: 'benchmark', label: 'Quality Benchmark', purpose: 'Successful search rate over time' },
      { id: 'rules', label: 'Translation Rules', purpose: 'Deterministic rule inventory' },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    sections: [
      { id: 'concepts', label: 'Concepts', purpose: 'Ontology editor and card coverage' },
      { id: 'relationships', label: 'Relationships', purpose: 'Concept graph edges' },
      { id: 'approaches', label: 'Approaches', purpose: 'How players solve the problem' },
      { id: 'clusters', label: 'Query Clusters', purpose: 'Emerging intents from real searches' },
      { id: 'opportunities', label: 'SEO Opportunities', purpose: 'Demand without a page' },
      { id: 'inventory', label: 'Content Inventory', purpose: 'Landing pages, guides and curated searches' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    sections: [
      { id: 'performance', label: 'Performance', purpose: 'Exception-based web vitals' },
      { id: 'api-health', label: 'API Health', purpose: 'Edge functions and pipelines' },
      { id: 'visibility', label: 'Visibility', purpose: 'Organic visibility and backlinks' },
      { id: 'releases', label: 'Releases', purpose: 'Did this release make OffMeta better' },
      { id: 'experiments', label: 'Experiments', purpose: 'Structured product tests' },
      { id: 'logs', label: 'Logs', purpose: 'Auth failures and raw telemetry' },
    ],
  },
] as const;

/** Old `/admin/:area/:section` paths kept working after the consolidation. */
const LEGACY_PATHS: Record<string, string> = {
  'search/zero-results': 'search/lab',
  'knowledge/classification': 'knowledge/concepts',
  'content/opportunities': 'knowledge/opportunities',
  'content/landing-pages': 'knowledge/inventory',
  'content/guides': 'knowledge/inventory',
  'content/related-searches': 'knowledge/inventory',
  'growth/acquisition': 'overview/product-health',
  'growth/funnels': 'overview/product-health',
  'growth/retention': 'search/benchmark',
  'growth/visibility': 'system/visibility',
};

/** Returns the current path for a legacy area/section pair, if one exists. */
export function resolveLegacyPath(
  areaId: string | undefined,
  sectionId: string | undefined,
): string | null {
  if (!areaId) return null;
  const direct = LEGACY_PATHS[`${areaId}/${sectionId ?? ''}`];
  if (direct) return direct;
  if (areaId === 'content') return 'knowledge/opportunities';
  if (areaId === 'growth') return 'overview/product-health';
  return null;
}

export function resolveArea(areaId: string | undefined): AdminArea {
  return ADMIN_AREAS.find((a) => a.id === areaId) ?? ADMIN_AREAS[0];
}

export function resolveSection(area: AdminArea, sectionId: string | undefined): AdminSection {
  return area.sections.find((s) => s.id === sectionId) ?? area.sections[0];
}

