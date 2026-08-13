/**
 * Deck intelligence pillars.
 *
 * Each pillar maps ontology tag keys (see public.ontology_tags) to a
 * functional slot every Commander-style deck needs, plus a benchmark
 * count expressed per 99 cards. Benchmarks are deliberately conservative
 * community heuristics — OffMeta surfaces coverage, the player decides.
 */

/** Coverage classification for a single pillar. */
export type CoverageLevel = 'very-low' | 'low' | 'moderate' | 'good' | 'high';

/** A functional slot measured against a decklist. */
export interface DeckPillar {
  /** Stable identifier used in URLs and telemetry. */
  key: string;
  /** Display label, e.g. "Card advantage". */
  label: string;
  /** Ontology tag keys that count toward this pillar. */
  tags: string[];
  /** Target card count per 99 non-commander cards. */
  benchmarkPer99: number;
  /** Plain-English explanation of why the slot matters. */
  rationale: string;
  /** Natural-language query used by the "find options" action. */
  gapQuery: string;
}

export const DECK_PILLARS: DeckPillar[] = [
  {
    key: 'ramp',
    label: 'Ramp',
    tags: ['ramp'],
    benchmarkPer99: 10,
    rationale: 'Extra mana lets you deploy ahead of the table.',
    gapQuery: 'ramp spells that add mana',
    },
  {
    key: 'card-advantage',
    label: 'Card advantage',
    tags: ['draw'],
    benchmarkPer99: 10,
    rationale: 'Repeatable draw keeps you from running out of action.',
    gapQuery: 'repeatable card draw engines',
  },
  {
    key: 'interaction',
    label: 'Interaction',
    tags: ['removal', 'counterspell', 'bounce'],
    benchmarkPer99: 8,
    rationale: 'Answers for the threats you cannot race.',
    gapQuery: 'efficient removal spells',
  },
  {
    key: 'board-wipes',
    label: 'Board wipes',
    tags: ['board_wipe'],
    benchmarkPer99: 3,
    rationale: 'A reset button for go-wide and combat decks.',
    gapQuery: 'board wipes that destroy all creatures',
  },
  {
    key: 'protection',
    label: 'Protection',
    tags: ['protection'],
    benchmarkPer99: 3,
    rationale: 'Keeps your engine or commander on the battlefield.',
    gapQuery: 'cards that protect your commander from removal',
  },
  {
    key: 'graveyard-hate',
    label: 'Graveyard hate',
    tags: ['graveyard_hate', 'recursion_hate'],
    benchmarkPer99: 1,
    rationale: 'Graveyard decks win uncontested without it.',
    gapQuery: 'graveyard hate cards',
  },
  {
    key: 'artifact-enchantment-hate',
    label: 'Artifact / enchantment hate',
    tags: ['artifact_hate', 'enchantment_hate', 'treasure_hate'],
    benchmarkPer99: 2,
    rationale: 'Rocks, Treasures and enchantment engines need answers.',
    gapQuery: 'cards that destroy artifacts and enchantments',
  },
  {
    key: 'tutors',
    label: 'Tutors',
    tags: ['tutor'],
    benchmarkPer99: 2,
    rationale: 'Consistency: find the piece the game is asking for.',
    gapQuery: 'tutors that search your library',
  },
  {
    key: 'recursion',
    label: 'Recursion',
    tags: ['recursion'],
    benchmarkPer99: 3,
    rationale: 'Rebuild after a wipe instead of conceding tempo.',
    gapQuery: 'cards that return permanents from your graveyard',
  },
  {
    key: 'pressure',
    label: 'Pressure',
    tags: ['token_generator', 'evasion', 'pump', 'equipment'],
    benchmarkPer99: 8,
    rationale: 'Something that actually converts a good board into a win.',
    gapQuery: 'creatures with evasion that close games',
  },
];

/** Coverage thresholds, expressed as ratio of benchmark. */
export function coverageLevel(ratio: number): CoverageLevel {
  if (ratio >= 1.25) return 'high';
  if (ratio >= 0.9) return 'good';
  if (ratio >= 0.6) return 'moderate';
  if (ratio > 0.25) return 'low';
  return 'very-low';
}

/** Human label for a coverage level. */
export const COVERAGE_LABEL: Record<CoverageLevel, string> = {
  'very-low': 'Very low',
  low: 'Low',
  moderate: 'Moderate',
  good: 'Good',
  high: 'High',
};
