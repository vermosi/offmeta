/**
 * "Why it matches" — deterministic, explainable match reporting.
 *
 * Given a card and the parsed SearchIntent, this module answers a single
 * question in the user's terms: *which parts of my intent caused this card to
 * surface?* Nothing here is AI-generated, scored, or probabilistic — every
 * field is derived from the parsed query constraints and the card's own
 * oracle text / type line / mana value, so the same input always yields the
 * same output and the explanation can never hallucinate.
 *
 * @module lib/search/whyItMatches
 */

import { explainCardMatch, type MatchReason } from '@/lib/search/matchExplanation';
import { extractRoles } from '@/lib/search/card-roles';
import type { ScryfallCard } from '@/types/card';
import type { SearchIntent } from '@/types/search';

/**
 * How directly the card answers the *semantic* part of the intent.
 * - `direct`: the card's oracle text matches a concept the user asked for.
 * - `structural`: only structural constraints matched (color, type, mana value).
 */
export type MatchDirectness = 'direct' | 'structural';

export interface WhyItMatches {
  /** Primary concept the user asked for, e.g. `treasure hate`. Lowercase. */
  concept: string | null;
  /** Whether the semantic concept matched, or only structural constraints. */
  directness: MatchDirectness;
  /** Deterministic one-line description of what this card does about it. */
  summary: string | null;
  /** Functional role key (e.g. `removal`, `draw`), or null when undetected. */
  role: string | null;
  /** Mechanical method key (e.g. `activation_tax`), or null when undetected. */
  method: string | null;
  /** Full structured reasons, reusable for refinement chips. */
  reasons: MatchReason[];
}

/** Oracle-text signatures for the mechanism a card uses. Order = priority. */
const METHOD_PATTERNS: Array<{ method: string; patterns: RegExp[] }> = [
  {
    method: 'activation_tax',
    patterns: [
      /activated abilit(?:y|ies) .*cost.*more/,
      /cost \{\d+\} more to activate/,
      /spells? .*cost \{\d+\} more/,
      /pay \{\d+\} more/,
    ],
  },
  {
    method: 'static_lock',
    patterns: [
      /players? can't/,
      /opponents? can't/,
      /doesn't untap/,
      /enters? tapped/,
      /can't be activated/,
      /activated abilities .*can't be activated/,
    ],
  },
  {
    method: 'mass_removal',
    patterns: [/destroy all/, /exile all/, /sacrifice all/, /each player sacrifices/],
  },
  {
    method: 'spot_removal',
    patterns: [/destroy target/, /exile target/, /return target .*to (?:its owner's|their owner's) hand/],
  },
  {
    method: 'counterspell',
    patterns: [/counter target/],
  },
  {
    method: 'sacrifice',
    patterns: [/sacrifices? (?:a|an|another|one|two|three)/, /sacrifice.*: /],
  },
  {
    method: 'triggered_payoff',
    patterns: [
      /whenever (?:a |an |one or more )?(?:opponent|player|creature|artifact|token)/,
      /whenever .*enters/,
      /whenever .*dies/,
      /at the beginning of/,
    ],
  },
  {
    method: 'activated_engine',
    patterns: [/\{t\}: /, /\{\d+\}(?:, \{t\})?: /],
  },
  {
    method: 'replacement_effect',
    patterns: [/if .* would .*, instead/, /instead of/],
  },
  {
    method: 'cost_reduction',
    patterns: [/cost \{\d+\} less/, /costs? less to cast/],
  },
];

/** Human-facing summary phrasing per method. */
const METHOD_SUMMARY: Record<string, string> = {
  activation_tax: 'Taxes the ability or spell your opponents rely on.',
  static_lock: 'Applies a static restriction that shuts the plan off.',
  mass_removal: 'Sweeps the relevant permanents off the board at once.',
  spot_removal: 'Answers a single problem permanent on demand.',
  counterspell: 'Stops it before it ever resolves.',
  sacrifice: 'Forces resources to be given up rather than used.',
  triggered_payoff: 'Triggers off the behaviour you searched for.',
  activated_engine: 'Repeatable activated ability you can use each turn.',
  replacement_effect: 'Replaces the effect before it happens.',
  cost_reduction: 'Makes the plan cheaper to execute.',
};

/** Structural fallback summaries, used when no mechanism is detected. */
const STRUCTURAL_SUMMARY = 'Matches the structural constraints in your search.';

function fullOracleText(card: ScryfallCard): string {
  const parts: string[] = [];
  if (card.oracle_text) parts.push(card.oracle_text);
  for (const face of card.card_faces ?? []) {
    if (face.oracle_text) parts.push(face.oracle_text);
  }
  return parts.join('\n').toLowerCase();
}

/** Detect the mechanical method a card uses, deterministically. */
export function detectMethod(card: ScryfallCard): string | null {
  const oracle = fullOracleText(card);
  if (!oracle) return null;
  for (const { method, patterns } of METHOD_PATTERNS) {
    if (patterns.some((p) => p.test(oracle))) return method;
  }
  return null;
}

/** Pick the dominant functional role for a card, or null when undetected. */
export function detectRole(card: ScryfallCard): string | null {
  const roles = extractRoles(fullOracleText(card) || null);
  return roles[0] ?? null;
}

/**
 * Derive the primary concept the user asked for from the parsed intent.
 * Prefers Scryfall function tags, then oracle phrases, then card types.
 */
export function deriveConcept(intent: SearchIntent | null | undefined): string | null {
  if (!intent) return null;
  const tag = intent.tags.find(Boolean);
  if (tag) {
    return tag
      .replace(/^otag:|^oracletag:|^functionality:/i, '')
      .replace(/["-]/g, ' ')
      .trim()
      .toLowerCase() || null;
  }
  const phrase = intent.oraclePatterns.find(Boolean);
  if (phrase) {
    const clean = phrase.replace(/^o:/i, '').replace(/^"|"$/g, '').trim().toLowerCase();
    if (clean) return clean.length > 42 ? `${clean.slice(0, 40)}…` : clean;
  }
  const type = intent.types.find(Boolean);
  return type ? type.toLowerCase() : null;
}

/**
 * Build the deterministic "why it matches" report for a card.
 * Returns `null` when there is no intent or nothing verifiably matched, so the
 * UI can omit the block rather than assert a reason it cannot substantiate.
 */
export function buildWhyItMatches(
  card: ScryfallCard,
  intent: SearchIntent | null | undefined,
): WhyItMatches | null {
  if (!intent) return null;

  const reasons = explainCardMatch(card, intent);
  if (reasons.length === 0) return null;

  const semanticTokens = reasons.filter((r) => {
    const token = r.token?.toLowerCase() ?? '';
    return token.startsWith('o:') || token.startsWith('otag:');
  });
  const directness: MatchDirectness = semanticTokens.length > 0 ? 'direct' : 'structural';

  const method = detectMethod(card);
  const role = detectRole(card);
  const summary =
    directness === 'direct'
      ? (method ? METHOD_SUMMARY[method] : null) ?? 'Its rules text covers what you asked for.'
      : STRUCTURAL_SUMMARY;

  return {
    concept: deriveConcept(intent),
    directness,
    summary,
    role,
    method,
    reasons,
  };
}
