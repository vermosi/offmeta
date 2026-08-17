/**
 * Functional fingerprinting for "cards like X".
 *
 * Matching on type + colour + mana value alone answers "what looks like this
 * card" instead of "what does this card *do*". Hermit Druid is a self-mill
 * enabler, not "a two-mana green creature", so similarity has to run on
 * Scryfall's functional (oracle) tags.
 *
 * Signatures are ordered from most specific to most generic; every emitted tag
 * is validated against the synced Scryfall Tagger vocabulary so we never ship
 * a hallucinated `otag:` that silently returns zero results.
 *
 * @module functions/card-similarity/functional
 */

import { SCRYFALL_ORACLE_TAG_SET } from '../_shared/otag-vocabulary.ts';

export interface FunctionalCard {
  typeLine?: string;
  oracleText?: string;
  keywords?: string[];
}

export interface FunctionalTagScore {
  tag: string;
  specificity: number;
}

interface Signature {
  /** Scryfall oracle tag emitted when the signature matches. */
  tag: string;
  /** Oracle-text (and occasionally type-line) pattern. */
  test: RegExp;
  /** Matched against the type line when the tag only applies to a card type. */
  type?: RegExp;
}

/**
 * Ordered most-specific-first. The first two distinct matches become the
 * card's functional fingerprint.
 */
const SIGNATURES: readonly Signature[] = [
  // Graveyard / mill
  {
    tag: 'self-mill',
    test: /puts?\b[^.]{0,80}\bcards?\b[^.]{0,80}\binto your graveyard\b|\byou mill\b|mills?\s+(?:yourself|\d+|\w+\s+cards?)/i,
  },
  {
    tag: 'mill-opponent',
    test: /(?:target\s+)?opponent\s+mills|each\s+opponent\s+mills/i,
  },
  { tag: 'mill', test: /\bmills?\b/i },
  {
    tag: 'reanimate',
    test: /return\s+(?:target|up to \w+ target)?\s*(?:creature|permanent)\s+cards?\s+from\s+(?:your|a)\s+graveyard\s+to\s+the\s+battlefield/i,
  },
  {
    tag: 'recursion',
    test: /return\s+.*\bfrom\s+(?:your|a)\s+graveyard\s+to\s+your\s+hand/i,
  },
  {
    tag: 'cast-from-graveyard',
    test: /(?:you may )?cast\s+.*\bfrom\s+your\s+graveyard/i,
  },
  {
    tag: 'cheat-into-play',
    test: /put\s+(?:it|that card|them)\s+onto\s+the\s+battlefield/i,
  },
  {
    tag: 'impulsive-draw',
    test: /exile the top\s+.*card of (?:that|target|the) (?:player's|opponent's|their) library.*you may (?:play|cast) that card/i,
  },

  // Card advantage / selection
  {
    tag: 'wheel',
    test: /each player (?:discards|shuffles).*draws\s+seven|discards? their hand.*draws? seven/i,
  },
  { tag: 'loot', test: /draws?\s+.*\bcards?\b.*then\s+discards?/i },
  {
    tag: 'draw-engine',
    test: /whenever\s+.*\bdraw\s+a\s+card\b|at the beginning of your\s+\w+\s+step,\s+draw/i,
  },
  { tag: 'draw', test: /\bdraws?\s+(?:a|two|three|\w+)\s+cards?\b/i },
  { tag: 'impulsive-draw', test: /exile the top\s+.*card.*you may play/i },

  // Tutors
  {
    tag: 'tutor',
    test: /search your library for (?:a|an|up to|two|three|any)\b(?!.*basic land card.*put)/i,
  },
  {
    tag: 'land-ramp',
    test: /search your library for (?:a|up to \w+)\s+(?:basic\s+)?land card.*(?:battlefield|onto)/i,
  },

  // Mana
  { tag: 'mana-rock', test: /add\s+\{[wubrgc]\}/i, type: /artifact/i },
  { tag: 'mana-dork', test: /add\s+\{[wubrgc]\}/i, type: /creature/i },
  { tag: 'ramp', test: /add\s+\{[wubrgc]\}/i },
  { tag: 'cost-reducer', test: /costs?\s+\{?\d?\w?\}?\s*less to cast/i },

  // Interaction
  {
    tag: 'counterspell',
    test: /counter target (?:spell|creature spell|noncreature spell)/i,
  },
  {
    tag: 'sweeper',
    test: /destroy all|exile all|each creature gets -\d+\/-\d+|all creatures get -\d/i,
  },
  {
    tag: 'spot-removal',
    test: /(?:destroy|exile) target (?:creature|permanent|nonland permanent|artifact|enchantment)/i,
  },
  {
    tag: 'bounce',
    test: /return target (?:creature|permanent|nonland permanent) to (?:its owner|their owner)/i,
  },
  {
    tag: 'discard',
    test: /target (?:opponent|player) discards|each opponent discards/i,
  },

  // Engines / payoffs
  {
    tag: 'sacrifice-outlet',
    test: /sacrifice (?:a|another|an)\s+(?:creature|permanent|artifact)\s*:/i,
  },
  {
    tag: 'repeatable-token-generator',
    test: /whenever .*create[s]?\s+.*\btoken/i,
  },
  {
    tag: 'repeatable-treasures',
    test: /\bcreate[s]?\s+(?:one or more\s+)?treasure\s+tokens?\b|\btreasure\s+tokens?\s+(?:to|under your control|onto the battlefield)/i,
  },
  {
    tag: 'flicker',
    test: /exile .*\breturn (?:it|them|that card) to the battlefield/i,
  },
  {
    tag: 'untapper',
    test: /untap target (?:creature|permanent|artifact|land)/i,
  },
  { tag: 'extra-turn', test: /take an extra turn/i },
  { tag: 'extra-combat', test: /additional combat phase/i },
  { tag: 'lifegain', test: /you gain \d+ life|gains? \d+ life/i },
  {
    tag: 'copy',
    test: /(?:copy|as a copy) of (?:target|that) (?:spell|creature|permanent)/i,
  },
  {
    tag: 'tax',
    test: /costs? \{?\d?\w?\}? more to cast|unless (?:that player|they) pays/i,
  },
  { tag: 'pillowfort', test: /can't attack you|attacks? you .*unless/i },
  {
    tag: 'protects-creature',
    test: /(?:gains?|has) (?:hexproof|indestructible|protection)/i,
  },
];

/** Signatures whose tag is too broad to stand alone as a fingerprint. */
const GENERIC_TAGS = new Set(['draw', 'ramp', 'mill', 'lifegain', 'discard']);

const SPECIFIC_TAGS = new Set([
  'self-mill',
  'mill-opponent',
  'reanimate',
  'cast-from-graveyard',
  'cheat-into-play',
  'impulsive-draw',
  'wheel',
  'loot',
  'draw-engine',
  'tutor',
  'land-ramp',
  'mana-rock',
  'mana-dork',
  'counterspell',
  'sweeper',
  'spot-removal',
  'bounce',
  'sacrifice-outlet',
  'repeatable-token-generator',
  'repeatable-treasures',
  'flicker',
  'untapper',
  'extra-turn',
  'extra-combat',
  'copy',
  'tax',
  'pillowfort',
  'protects-creature',
]);

/**
 * Derives up to two Scryfall oracle tags describing what the card *does*.
 * Returns an empty array when nothing matches, so callers can fall back to the
 * legacy type/mana-value heuristic.
 */
export function deriveFunctionalTags(card: FunctionalCard): string[] {
  const oracle = card.oracleText ?? '';
  const typeLine = card.typeLine ?? '';
  if (!oracle.trim()) return [];

  const tags: string[] = [];
  for (const signature of SIGNATURES) {
    if (tags.length >= 2) break;
    if (signature.type && !signature.type.test(typeLine)) continue;
    if (!signature.test.test(oracle)) continue;
    if (!SCRYFALL_ORACLE_TAG_SET.has(signature.tag)) continue;
    if (tags.includes(signature.tag)) continue;
    tags.push(signature.tag);
  }

  // A single generic tag ("draw") is a weak fingerprint on its own; keep it
  // only when it is paired with something specific.
  if (tags.length === 1 && GENERIC_TAGS.has(tags[0])) {
    return tags;
  }

  return tags;
}

/** True when the fingerprint is specific enough to replace type/mv matching. */
export function isStrongFingerprint(tags: string[]): boolean {
  return tags.some((tag) => !GENERIC_TAGS.has(tag));
}

export function scoreFunctionalTags(tags: string[]): number {
  if (tags.length === 0) return 0;
  const weighted = tags.reduce((sum, tag, index) => {
    const specificity = SPECIFIC_TAGS.has(tag) ? 1 : 0.5;
    const bonus = index === 0 ? 0.2 : 0.1;
    return sum + specificity + bonus;
  }, 0);
  return Math.min(weighted / 2.5, 1);
}
