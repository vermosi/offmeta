/**
 * Admin control-room information architecture.
 *
 * Six areas, each holding action-oriented sections. Routing is
 * `/admin/:area/:section` with sensible defaults, so every view is linkable
 * from the Operations Inbox.
 */

export type AdminAreaId =
  | 'overview'
  | 'search'
  | 'knowledge'
  | 'content'
  | 'growth'
  | 'system';

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
      { id: 'product-health', label: 'Product Health', purpose: 'Successful search rate and usage' },
      { id: 'alerts', label: 'Alerts', purpose: 'Errors, pipelines and freshness' },
    ],
  },
  {
    id: 'search',
    label: 'Search',
    sections: [
      { id: 'lab', label: 'Search Lab', purpose: 'Diagnose a single query end to end' },
      { id: 'repair', label: 'Repair Queue', purpose: 'Human-in-the-loop rule review' },
      { id: 'zero-results', label: 'Zero Results', purpose: 'Queries returning nothing' },
      { id: 'benchmark', label: 'Quality Benchmark', purpose: 'Successful search rate over time' },
      { id: 'rules', label: 'Translation Rules', purpose: 'Deterministic rule inventory' },
    ],
  },
  {
    id: 'knowledge',
    label: 'Knowledge',
    sections: [
      { id: 'concepts', label: 'Concepts', purpose: 'Ontology editor' },
      { id: 'relationships', label: 'Relationships', purpose: 'Concept graph edges' },
      { id: 'approaches', label: 'Approaches', purpose: 'How players solve the problem' },
      { id: 'clusters', label: 'Query Clusters', purpose: 'Emerging intents from real searches' },
      { id: 'classification', label: 'Card Classification', purpose: 'Coverage of the card corpus' },
    ],
  },
  {
    id: 'content',
    label: 'Content',
    sections: [
      { id: 'opportunities', label: 'SEO Opportunities', purpose: 'Demand without a page' },
      { id: 'landing-pages', label: 'Landing Pages', purpose: 'Declared entrances into search' },
      { id: 'guides', label: 'Guides', purpose: 'Editorial coverage' },
      { id: 'related-searches', label: 'Related Searches', purpose: 'Curated search inventory' },
    ],
  },
  {
    id: 'growth',
    label: 'Growth',
    sections: [
      { id: 'acquisition', label: 'Acquisition', purpose: 'Which channels bring real usage' },
      { id: 'funnels', label: 'Funnels', purpose: 'Journey from arrival to action' },
      { id: 'retention', label: 'Retention', purpose: 'Returning searchers' },
      { id: 'visibility', label: 'Visibility', purpose: 'Organic visibility and backlinks' },
    ],
  },
  {
    id: 'system',
    label: 'System',
    sections: [
      { id: 'performance', label: 'Performance', purpose: 'Exception-based web vitals' },
      { id: 'api-health', label: 'API Health', purpose: 'Edge functions and pipelines' },
      { id: 'releases', label: 'Releases', purpose: 'Did this release make OffMeta better' },
      { id: 'experiments', label: 'Experiments', purpose: 'Structured product tests' },
      { id: 'logs', label: 'Logs', purpose: 'Auth failures and raw telemetry' },
    ],
  },
] as const;

export function resolveArea(areaId: string | undefined): AdminArea {
  return ADMIN_AREAS.find((a) => a.id === areaId) ?? ADMIN_AREAS[0];
}

export function resolveSection(area: AdminArea, sectionId: string | undefined): AdminSection {
  return area.sections.find((s) => s.id === sectionId) ?? area.sections[0];
}
