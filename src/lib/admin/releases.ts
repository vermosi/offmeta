/**
 * Release and experiment registry.
 *
 * Release markers let metric movements be attributed to product changes,
 * answering "did this release make OffMeta better?". Add a new entry at the
 * top whenever a user-visible change ships.
 */

export interface ReleaseMarker {
  /** ISO date, used as the marker position on trend charts. */
  date: string;
  version: string;
  changes: readonly string[];
}

export const RELEASES: readonly ReleaseMarker[] = [
  {
    date: '2026-08-13',
    version: '2026.08.13',
    changes: [
      'Admin control room (operations inbox, search lab, concept manager)',
      'Concept editing for the semantic knowledge graph',
      'Opportunity scoring for content and search fixes',
    ],
  },
  {
    date: '2026-08-12',
    version: '2026.08.12',
    changes: ['Self-heal diagnostics with reason codes', 'otag vocabulary validation'],
  },
] as const;

export type ExperimentStatus = 'draft' | 'running' | 'concluded';

export interface Experiment {
  id: string;
  name: string;
  status: ExperimentStatus;
  hypothesis: string;
  control: string;
  variant: string;
  /** Behavioural metrics the experiment is judged on. */
  metrics: readonly string[];
}

export const EXPERIMENTS: readonly Experiment[] = [
  {
    id: 'result-explanations',
    name: 'Result explanations',
    status: 'running',
    hypothesis: 'Explaining why a card matches increases card opens and reduces abandonment.',
    control: 'Cards only',
    variant: 'Cards + Why It Matches',
    metrics: ['card_opens', 'refinement', 'search_abandonment', 'continued_search'],
  },
] as const;
