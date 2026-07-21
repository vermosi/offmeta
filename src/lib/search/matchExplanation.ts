/**
 * Generate short, human-readable "why this matches" reasons for a card
 * based on the parsed SearchIntent from the translation pipeline.
 *
 * Each reason optionally carries a Scryfall `token` (e.g. `otag:treasure`,
 * `t:creature`, `c:r`) so the UI can offer a one-click refinement that
 * appends the matched concept back into the search query.
 * @module lib/search/matchExplanation
 */

import type { ScryfallCard } from '@/types/card';
import type { SearchIntent } from '@/types/search';

const COLOR_NAMES: Record<string, string> = {
  W: 'white',
  U: 'blue',
  B: 'black',
  R: 'red',
  G: 'green',
  C: 'colorless',
};

export interface MatchReason {
  /** Human-readable label rendered in the tooltip. */
  label: string;
  /**
   * Optional Scryfall token that represents this match. When present, the UI
   * can offer a one-click refine that appends this token to the current query.
   */
  token?: string;
}

function cardText(card: ScryfallCard): string {
  const parts: string[] = [];
  if (card.oracle_text) parts.push(card.oracle_text);
  if (card.card_faces) {
    for (const face of card.card_faces) {
      if (face.oracle_text) parts.push(face.oracle_text);
    }
  }
  return parts.join(' \n ').toLowerCase();
}

function cardTypeLine(card: ScryfallCard): string {
  const parts: string[] = [];
  if (card.type_line) parts.push(card.type_line);
  if (card.card_faces) {
    for (const face of card.card_faces) {
      if (face.type_line) parts.push(face.type_line);
    }
  }
  return parts.join(' // ').toLowerCase();
}

function cardCmc(card: ScryfallCard): number | undefined {
  return typeof card.cmc === 'number' ? card.cmc : undefined;
}

function compare(op: string, a: number, b: number): boolean {
  switch (op) {
    case '<': return a < b;
    case '<=': return a <= b;
    case '>': return a > b;
    case '>=': return a >= b;
    case '=':
    case ':':
    case '==': return a === b;
    default: return false;
  }
}

/** Quote a Scryfall value if it contains spaces so the token remains valid. */
function quoteIfNeeded(value: string): string {
  return /\s/.test(value) ? `"${value}"` : value;
}

/**
 * Extract structured reasons describing why a card matches the parsed intent.
 * Returns an empty array when no intent is provided or nothing matched.
 */
export function explainCardMatch(
  card: ScryfallCard,
  intent: SearchIntent | null | undefined,
): MatchReason[] {
  if (!intent) return [];

  const reasons: MatchReason[] = [];
  const cardColors = new Set(card.color_identity ?? card.colors ?? []);
  const oracle = cardText(card);
  const types = cardTypeLine(card);
  const cmc = cardCmc(card);

  // Colors
  if (intent.colors && intent.colors.values.length > 0) {
    const wanted = intent.colors.values;
    const matched = wanted.filter((c) => cardColors.has(c));
    if (matched.length > 0) {
      const names = matched.map((c) => COLOR_NAMES[c] ?? c).join('/');
      const prefix = intent.colors.isIdentity ? 'ci' : 'c';
      reasons.push({
        label: intent.colors.isIdentity ? `Color identity: ${names}` : `Color: ${names}`,
        token: `${prefix}:${matched.join('').toLowerCase()}`,
      });
    }
  }

  // Types
  if (intent.types.length > 0) {
    const matched = intent.types.filter((t) => types.includes(t.toLowerCase()));
    if (matched.length > 0) {
      reasons.push({
        label: `Type: ${matched.join(', ')}`,
        token: matched.map((t) => `t:${quoteIfNeeded(t.toLowerCase())}`).join(' '),
      });
    }
  }

  // Mana value
  if (intent.cmc && typeof cmc === 'number' && compare(intent.cmc.op, cmc, intent.cmc.value)) {
    reasons.push({
      label: `Mana value ${intent.cmc.op}${intent.cmc.value} (this is ${cmc})`,
      token: `mv${intent.cmc.op}${intent.cmc.value}`,
    });
  }

  // Power / toughness
  const pow = card.power ? Number(card.power) : NaN;
  const tou = card.toughness ? Number(card.toughness) : NaN;
  if (intent.power && !Number.isNaN(pow) && compare(intent.power.op, pow, intent.power.value)) {
    reasons.push({
      label: `Power ${intent.power.op}${intent.power.value}`,
      token: `pow${intent.power.op}${intent.power.value}`,
    });
  }
  if (intent.toughness && !Number.isNaN(tou) && compare(intent.toughness.op, tou, intent.toughness.value)) {
    reasons.push({
      label: `Toughness ${intent.toughness.op}${intent.toughness.value}`,
      token: `tou${intent.toughness.op}${intent.toughness.value}`,
    });
  }

  // Oracle patterns (approximate: substring or regex-safe token match)
  for (const raw of intent.oraclePatterns) {
    if (!raw) continue;
    const clean = raw.replace(/^o:/i, '').replace(/^"|"$/g, '').trim().toLowerCase();
    if (!clean) continue;
    if (oracle.includes(clean)) {
      const label = clean.length > 40 ? `${clean.slice(0, 37)}…` : clean;
      reasons.push({
        label: `Oracle text: "${label}"`,
        token: `o:${quoteIfNeeded(clean)}`,
      });
    }
  }

  // Tags (Scryfall function/oracle tags — surface as clickable concept refinements)
  for (const tag of intent.tags) {
    if (!tag) continue;
    const clean = tag.replace(/^otag:|^oracletag:|^functionality:/i, '').trim();
    if (clean) {
      reasons.push({
        label: `Matched concept: ${clean}`,
        token: `otag:${quoteIfNeeded(clean.toLowerCase())}`,
      });
    }
  }

  return reasons;
}
