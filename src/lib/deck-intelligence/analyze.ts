/**
 * Deterministic deck analysis.
 *
 * Consumes cards already resolved against the OffMeta card ontology and
 * produces a coverage profile plus ranked gaps. Pure functions only —
 * no network, no React, fully testable.
 */

import {
  DECK_PILLARS,
  coverageLevel,
  type CoverageLevel,
  type DeckPillar,
} from './pillars';

/** A decklist entry after ontology resolution. */
export interface ResolvedDeckCard {
  name: string;
  quantity: number;
  oracleId: string | null;
  typeLine: string | null;
  /** Ontology tag keys assigned to this card. */
  tags: string[];
}

/** Coverage result for one pillar. */
export interface PillarCoverage {
  pillar: DeckPillar;
  /** Number of cards (counting quantities) matching the pillar. */
  count: number;
  /** Benchmark scaled to this decklist's spell count. */
  benchmark: number;
  /** count / benchmark, clamped at 2. */
  ratio: number;
  level: CoverageLevel;
  /** Up to four representative card names from the deck. */
  examples: string[];
}

/** Full deck profile. */
export interface DeckProfile {
  totalCards: number;
  landCount: number;
  spellCount: number;
  /** Cards that could not be matched to the card database. */
  unresolved: string[];
  /** Cards matched but carrying no ontology tags. */
  untagged: string[];
  coverage: PillarCoverage[];
  /** Pillars below benchmark, weakest first. */
  gaps: PillarCoverage[];
}

/** Reference spell count for a 99-card Commander deck (99 minus ~35 lands). */
const REFERENCE_SPELL_COUNT = 64;

const isLand = (typeLine: string | null): boolean =>
  !!typeLine && /\bland\b/i.test(typeLine) && !/\bcreature\b/i.test(typeLine);

/** Build a full coverage profile from resolved cards. */
export function analyzeDeck(cards: ResolvedDeckCard[]): DeckProfile {
  const totalCards = cards.reduce((sum, c) => sum + c.quantity, 0);
  const landCount = cards
    .filter((c) => isLand(c.typeLine))
    .reduce((sum, c) => sum + c.quantity, 0);
  const spellCount = Math.max(totalCards - landCount, 0);

  const scale = spellCount > 0 ? spellCount / REFERENCE_SPELL_COUNT : 1;

  const coverage = DECK_PILLARS.map<PillarCoverage>((pillar) => {
    const tagSet = new Set(pillar.tags);
    const matches = cards.filter((card) =>
      card.tags.some((tag) => tagSet.has(tag)),
    );
    const count = matches.reduce((sum, c) => sum + c.quantity, 0);
    const benchmark = Math.max(1, Math.round(pillar.benchmarkPer99 * scale));
    const ratio = Math.min(count / benchmark, 2);

    return {
      pillar,
      count,
      benchmark,
      ratio,
      level: coverageLevel(count / benchmark),
      examples: matches.slice(0, 4).map((c) => c.name),
    };
  });

  const gaps = coverage
    .filter((c) => c.level === 'very-low' || c.level === 'low')
    .sort((a, b) => a.ratio - b.ratio);

  return {
    totalCards,
    landCount,
    spellCount,
    unresolved: cards.filter((c) => !c.oracleId).map((c) => c.name),
    untagged: cards
      .filter((c) => c.oracleId && c.tags.length === 0 && !isLand(c.typeLine))
      .map((c) => c.name),
    coverage,
    gaps,
  };
}
